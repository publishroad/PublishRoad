update admin_users
set
  password_hash = crypt('AKshubin1!', gen_salt('bf', 12)),
  updated_at = now()
where lower(email) = lower('adminak@publishroad.com');