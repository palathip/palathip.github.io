# Image Gen - วิธีตั้งค่า

GitHub Pages รองรับแค่ไฟล์ static ไม่มี API ดังนั้นต้อง deploy API proxy แยกบน Vercel

## ขั้นตอน

### 1. Deploy API ไป Vercel

1. ไปที่ [vercel.com](https://vercel.com) แล้ว Sign in ด้วย GitHub
2. คลิก **Add New** → **Project**
3. เลือก repo `palathip.github.io` (หรือชื่อ repo ของคุณ)
4. ตั้งค่า:
   - **Root Directory**: เลือก root ของโปรเจกต์
   - **Build Command**: ว่างไว้ (ไม่ต้อง build)
   - **Output Directory**: ว่างไว้ หรือ `public` ถ้ามี
5. คลิก **Deploy**
6. รอ deploy เสร็จ แล้ว copy URL เช่น `https://palathip-github-io-xxx.vercel.app`

### 2. ใส่ Proxy URL ในหน้า Image Gen

แก้ไขไฟล์ `image-gen/index.html` บรรทัดที่มี `proxy-config`:

```html
<script id="proxy-config" data-proxy-url="https://palathip-github-io.vercel.app/api/fal-proxy"></script>
```

เปลี่ยน `YOUR_VERCEL_URL` เป็น URL จริงที่ได้จาก Vercel (เช่น `palathip-github-io-abc123`)

### 3. Push ขึ้น GitHub

```bash
git add image-gen/index.html
git commit -m "Add Image Gen proxy URL"
git push
```

---

**หมายเหตุ:** ทุกครั้งที่ push repo ขึ้น GitHub, Vercel จะ deploy ใหม่อัตโนมัติ (ถ้าเชื่อม repo ไว้แล้ว)
