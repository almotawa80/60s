# تطبيق اهزم الدقيقة للآيفون (Capacitor)

غلاف آيفون يحمّل `https://beat60s.com` مباشرة. كل تحديث ينشر على الموقع يوصل للتطبيق فوراً بدون مراجعة أبل.
صفحة `www/error.html` بس محلية، وتطلع إذا ما في إنترنت.

| | |
|---|---|
| المعرّف | `com.beat60s.app` |
| الاسم على الجوال | اهزم الدقيقة |
| الأجهزة | آيفون فقط (يشتغل على الآيباد بوضع الآيفون) |
| الحد الأدنى | iOS 15 |
| الاتجاه | عمودي |

الموقع يعرف إنه داخل التطبيق من `Beat60sApp` في الـ User-Agent (`isApp()` في app.js)، ويخفي فيه إشعارات الويب وزر «تثبيت على الشاشة الرئيسية».

## التجهيز على الماك (مرة وحدة)
1. ثبّت Xcode من App Store وافتحه مرة ووافق على الترخيص.
2. ثبّت Node من nodejs.org.
3. في Terminal:
   ```
   git clone https://github.com/almotawa80/60s
   cd 60s/mobile
   npm install
   npx cap sync ios
   npx cap open ios
   ```

## التوقيع
Xcode › المشروع App › Signing & Capabilities › فعّل Automatically manage signing › اختر فريقك.

## الرفع
1. Xcode: اختر «Any iOS Device (arm64)» فوق، ثم Product › Archive.
2. Organizer: Distribute App › App Store Connect › Upload.
3. App Store Connect: التطبيق «اهزم الدقيقة» › TestFlight للتجربة، ثم Submit for Review.
4. كل إصدار جديد للتطبيق نفسه (مو للموقع): ارفع Version و Build في General › Identity.

## الأيقونة وشاشة البداية
المصادر في `resources/`. بعد تغييرها: `npm run assets`.

## حفظ كلمة المرور (Passwords)
التطبيق مربوط بالموقع عبر Associated Domains (`webcredentials:beat60s.com` في `App.entitlements`). يكتمل الربط بملف `.well-known/apple-app-site-association` على الموقع وفيه `<TEAM_ID>.com.beat60s.app`، وبعدها إصدار جديد من Xcode.
