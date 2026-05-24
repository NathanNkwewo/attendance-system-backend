/**
 * Haversine formula — calculates distance in metres between two GPS coordinates.
 * Used to verify a student is within the 150m geofence of the classroom.
 */

const EARTH_RADIUS_METRES = 6371000
const GEOFENCE_RADIUS_METRES = 150

/**
 * @param {number} lat1 - Faculty/classroom latitude
 * @param {number} lon1 - Faculty/classroom longitude
 * @param {number} lat2 - Student submitted latitude
 * @param {number} lon2 - Student submitted longitude
 * @returns {number} Distance in metres
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METRES * c
}

/**
 * Returns whether a student is within the geofence.
 * @param {number} classLat
 * @param {number} classLon
 * @param {number} studentLat
 * @param {number} studentLon
 * @returns {{ verified: boolean, distance: number }}
 */
const verifyGeofence = (classLat, classLon, studentLat, studentLon) => {
  const distance = haversineDistance(classLat, classLon, studentLat, studentLon)
  return {
    distance: Math.round(distance * 10) / 10, // round to 1 decimal
    verified: distance <= GEOFENCE_RADIUS_METRES,
  }
}

module.exports = { haversineDistance, verifyGeofence, GEOFENCE_RADIUS_METRES }
