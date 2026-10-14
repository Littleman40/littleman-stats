// shared by the car scraper and the servers page
// the no hesi api only gives model ids, never display names, so the raw id is always what we show

// ai traffic cars are on every server but are not cars a player can pick
export function fnIsTrafficCar(model) {
  return model.includes('_traffic_');
}
