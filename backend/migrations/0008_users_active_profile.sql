-- Status aktif pengguna (dinonaktifkan admin = tidak bisa login)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
