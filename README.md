# لَمّة البيت — منصة سينما العائلة والذكريات

منصة عربية متكاملة للمشاهدة العائلية والقصص والذكريات والصوتيات مع وضع تلفاز سامسونج الذكي (Samsung Tizen TV)، متصلة مباشرة بمشروع Firebase الحالي (`noor-el-hekaya`) ومجموعة البيانات `episodes`.

---

## الربط مع Firebase (`noor-el-hekaya`)

* **معرّف المشروع (Project ID):** `noor-el-hekaya`
* **المجموعة السحابية المستخدمة:** `episodes`
* **المواءمة غير التدميرية:** عبر `src/lib/episodeAdapter.ts` و`{ merge: true }` للحفاظ على جميع الحقول والبيانات القديمة (`mediaUrl`, `imageUrl`, `eventDate`, `timelineStatus`, `timelineOrder`, `storagePath`, `photo`, `event`).
* **تفضيلات المستخدم:** المفضلة، المشاهدة لاحقاً، متابعة المشاهدة، الباقات، ودفتر العيلة محفوظة في `localStorage` مع مزامنة لمفاتيح النسخة السابقة (`lammet-elbeit-local-v1`, `lammet-progress-v1`, إلخ).

> **خطوة مهمة لتسجيل دخول المشرف (`/admin`) على أي رابط جديد:**
> افتح **Firebase Console** ← مشروع **`noor-el-hekaya`** ← **Authentication** ← **Settings** ← **Authorized domains** وأضف رابط موقعك (مثل `username.github.io` أو `your-app.vercel.app` أو `noor-el-hekaya.web.app`).

---

## التشغيل محلياً

```bash
npm install
npm run dev
```

سيعمل التطبيق على `http://localhost:3000`.

---

## الرفع على GitHub والنشر

1. ارفع جميع ملفات الحزمة مباشرة إلى جذر مستودع جديد على GitHub (ملف `.gitignore` يضبط استبعاد `node_modules` و`dist` تلقائياً).
2. **للنشر المجاني التلقائي عبر GitHub Pages:**
   * من إعدادات المستودع على GitHub: **Settings → Pages → Source** اختر **GitHub Actions**.
   * سيقوم ملف `.github/workflows/deploy-pages.yml` بتشغيل `npm install` وبناء التطبيق بالمسار الفرعي المناسب ونسخ `404.html` تلقائياً عند كل `push` على فرع `main`.
   * لا تنس إضافة نطاق `<username>.github.io` في Firebase Console تحت **Authentication → Settings → Authorized domains** لتسجيل دخول المشرف.
3. **أو للنشر عبر Vercel / Netlify / Firebase Hosting:**
   * أمر البناء: `npm run build`
   * مجلد الإخراج: `dist`

---

## بناء حزمة تلفاز سامسونج (Samsung Tizen TV)

```bash
npm run build:tizen
```

يُنتج مجلد `dist-tizen/` وملفات ZIP الجاهزة داخل `public/downloads/`.
