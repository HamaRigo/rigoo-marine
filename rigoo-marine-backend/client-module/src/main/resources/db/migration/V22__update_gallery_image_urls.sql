-- Point gallery before/after items at service poster images that already
-- ship as static assets in the frontend build. No upload required — the
-- paths are served by the frontend nginx at /services_img/posters/*.
-- Before = the diagnostic/raw state; After = the completed work state.

UPDATE gallery_items SET
  before_url = '/services_img/posters/Engine Diagnostics.jpeg',
  after_url  = '/services_img/posters/Generator Service.jpg',
  updated_at = NOW()
WHERE title = 'Engine Rebuild';

UPDATE gallery_items SET
  before_url = '/services_img/posters/poster-structural.png',
  after_url  = '/services_img/posters/Hull Cleaning.jpg',
  updated_at = NOW()
WHERE title = 'Hull Restoration';

UPDATE gallery_items SET
  before_url = '/services_img/posters/poster-cosmetic.png',
  after_url  = '/services_img/posters/complete-electrical-inspection.jpeg',
  updated_at = NOW()
WHERE title = 'Gel Coat Polish';

UPDATE gallery_items SET
  before_url = '/services_img/posters/poster-renovation.png',
  after_url  = '/services_img/posters/bottom-paint.jpeg',
  updated_at = NOW()
WHERE title = 'Bottom Paint';

UPDATE gallery_items SET
  before_url = '/services_img/posters/Transmission.jpg',
  after_url  = '/services_img/posters/Propeller Repair.jpeg',
  updated_at = NOW()
WHERE title = 'Propeller Repair';

UPDATE gallery_items SET
  before_url = '/services_img/posters/Oil Change.jpg',
  after_url  = '/services_img/posters/De-winterization.jpeg',
  updated_at = NOW()
WHERE title = 'Transom Replacement';
