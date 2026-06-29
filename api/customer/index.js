const { getPool, sql } = require("../shared/db");
const { getSessionFromRequest } = require("../shared/jwt");

function formatStop(location, suburb, time) {
  const place = [location, suburb].filter(Boolean).join(", ");
  if (!place && !time) return "Not assigned";
  if (!time) return place;
  if (!place) return `Pickup ${time}`;
  return `${place} — pickup ${time}`;
}

function buildMapUrl(lat, lon) {
  if (!lat || !lon) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
}

module.exports = async function (context, req) {
  const session = getSessionFromRequest(req);

  if (!session) {
    context.res = { status: 401, body: { error: "Not signed in." } };
    return;
  }

  try {
    const pool = await getPool();
    // RTRIM strips the trailing spaces that fixed-length nchar columns are
    // padded with - without it, names and addresses would render with extra
    // whitespace.
    const result = await pool
      .request()
      .input("email", sql.NVarChar, session.email)
      .query(`
        SELECT
          RTRIM(c.CustomerBillingFirstName) AS ParentFirstName,
          RTRIM(c.CustomerBillingSurname)   AS ParentSurname,
          RTRIM(c.CustomerFirstName)        AS StudentFirstName,
          RTRIM(c.CustomerSurname)          AS StudentSurname,
          RTRIM(stopAM.StopLocation)        AS StopLocationAM,
          RTRIM(stopAM.StopSuburb)          AS StopSuburbAM,
          RTRIM(stopAM.StopTime)            AS PickupTimeAM,
          RTRIM(stopAM.StopLat)             AS StopLatAM,
          RTRIM(stopAM.StopLon)             AS StopLonAM,
          RTRIM(stopPM.StopLocation)        AS StopLocationPM,
          RTRIM(stopPM.StopSuburb)          AS StopSuburbPM,
          RTRIM(stopPM.StopTime)            AS PickupTimePM,
          RTRIM(stopPM.StopLat)             AS StopLatPM,
          RTRIM(stopPM.StopLon)             AS StopLonPM
        FROM dbo.SchoolServiceCustomers c
        LEFT JOIN dbo.ServiceStops stopAM ON stopAM.StopUniqueID = c.CustomerStopAMID
        LEFT JOIN dbo.ServiceStops stopPM ON stopPM.StopUniqueID = c.CustomerStopPMID
        WHERE c.CustomerEmail = @email
      `);

    if (result.recordset.length === 0) {
      context.res = { status: 404, body: { error: "No record found for this account." } };
      return;
    }

    const row = result.recordset[0];

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        Name: `${row.ParentFirstName} ${row.ParentSurname}`.trim(),
        Student: `${row.StudentFirstName} ${row.StudentSurname}`.trim(),
        PickupAM: formatStop(row.StopLocationAM, row.StopSuburbAM, row.PickupTimeAM),
        PickupPM: formatStop(row.StopLocationPM, row.StopSuburbPM, row.PickupTimePM),
        MapUrlAM: buildMapUrl(row.StopLatAM, row.StopLonAM),
        MapUrlPM: buildMapUrl(row.StopLatPM, row.StopLonPM),
      },
    };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: "Something went wrong loading your record." } };
  }
};
