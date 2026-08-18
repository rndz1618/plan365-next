# Deploy Plan365 ke Cloud

## Prasyarat

- Source code sudah di-upload ke GitHub repository
- Database: **PostgreSQL** (sudah dikonfigurasi di `prisma/schema.prisma`)
- Package manager: **npm** (package-lock.json sudah disertakan)

---

## Opsi 1: Render (Recommended)

### Langkah-langkah:

1. **Push ke GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Plan365"
   git remote add origin https://github.com/USERNAME/plan365.git
   git push -u origin main
   ```

2. **Buat di Render.com**
   - Buka [render.com](https://render.com) → Dashboard → **New** → **Blueprint**
   - Pilih repository GitHub
   - Render akan otomatis baca `render.yaml`
   - Klik **Apply**

3. **Environment Variables** (otomatis dari render.yaml)
   - `DATABASE_URL` → auto dari PostgreSQL Add-on
   - `JWT_SECRET` → auto-generated
   - `NODE_ENV` → production

4. **Build otomatis** - Render akan menjalankan:
   ```bash
   npm install && npx prisma generate && npx prisma db push --accept-data-loss && npm run build
   ```

5. **Buat Admin User** (setelah deploy berhasil)
   - Buka app URL di browser
   - Register akun baru melalui halaman login
   - Atau gunakan API: `POST /api/auth/register`

### Manual Setup (tanpa Blueprint):

1. **New Web Service** → connect repo
2. **Runtime:** Node.js
3. **Build Command:**
   ```bash
   npm install && npx prisma generate && npx prisma db push --accept-data-loss && npm run build
   ```
4. **Start Command:**
   ```bash
   node .next/standalone/server.js
   ```
5. **New PostgreSQL** database
6. **Environment Variables:**
   - `DATABASE_URL` = (dari PostgreSQL internal database)
   - `JWT_SECRET` = (generate random string)
   - `NODE_ENV` = production

---

## Opsi 2: Railway

1. Buka [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Railway auto-detect Next.js
4. **Build Command:**
   ```bash
   npm install && npx prisma generate && npx prisma db push --accept-data-loss && npm run build
   ```
5. **Start Command:**
   ```bash
   node .next/standalone/server.js
   ```
6. **Add PostgreSQL** plugin (di tab Services)
7. Railway auto-inject `DATABASE_URL`
8. Tambah manual: `JWT_SECRET`

---

## Opsi 3: Vercel + Supabase/Neon

1. **Database:** Buat project di [Neon](https://neon.tech) atau [Supabase](https://supabase.com)
2. **Vercel:** Import repo → auto deploy
3. Di Vercel Settings → Environment Variables:
   - `DATABASE_URL` = (dari Neon/Supabase)
   - `JWT_SECRET` = random string
4. Jalankan migration sebelum deploy:
   ```bash
   npx prisma db push --accept-data-loss
   ```

---

## Opsi 4: VPS (DigitalOcean / Hetzner)

### Setup:

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb plan365
sudo -u postgres psql -c "CREATE USER plan365 WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE plan365 TO plan365;"

# Setup app
cd /opt/plan365
npm install
npx prisma generate
npx prisma db push --accept-data-loss
npm run build

# Run with PM2
pm2 start "node .next/standalone/server.js" --name plan365
pm2 save
pm2 startup
```

### Environment Variables (.env):
```
DATABASE_URL="postgresql://plan365:your-password@localhost:5432/plan365"
JWT_SECRET="your-random-secret-key"
NODE_ENV="production"
```

---

## Troubleshooting

### Build gagal: "prisma generate" error
- Pastikan `DATABASE_URL` sudah di-set sebelum build
- Di Render, `DATABASE_URL` auto dari database service

### Build gagal: module not found
- Hapus `node_modules` dan `package-lock.json`, lalu `npm install` ulang
- Pastikan `package-lock.json` sudah termasuk di repo

### App berjalan tapi error 500
- Cek Render logs untuk error detail
- Pastikan `prisma db push` berhasil dijalankan saat build
- Pastikan `JWT_SECRET` sudah di-set

### Database connection error
- Pastikan PostgreSQL sudah berjalan
- Cek format `DATABASE_URL`: `postgresql://user:pass@host:5432/dbname`

### Port error
- App menggunakan port dari environment variable `PORT`
- Next.js standalone mode auto-detect port
- Jika manual, set `PORT=3000` di environment
