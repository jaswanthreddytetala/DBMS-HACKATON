-- Demo users are created safely by DemoDataConfig so BCrypt hashes are not hardcoded.
INSERT INTO charging_stations(name,address,city,latitude,longitude,price_per_kwh,operating_hours,available,operator_id) VALUES
('Marina Green Hub','200 Marina Blvd','San Francisco',37.8067000,-122.4398000,0.39,'24/7',TRUE,NULL),
('Mission Bay Charge','185 Channel St','San Francisco',37.7749000,-122.3875000,0.34,'06:00-23:00',TRUE,NULL),
('Presidio Power Point','210 Lincoln Blvd','San Francisco',37.7989000,-122.4662000,0.42,'24/7',TRUE,NULL);
INSERT INTO chargers(code,connector_type,power_kw,status,station_id) VALUES
('MG-01','CCS2',250,'AVAILABLE',1),('MG-02','NACS',180,'OCCUPIED',1),('MB-01','CCS2',150,'AVAILABLE',2),('PP-01','NACS',180,'AVAILABLE',3);
