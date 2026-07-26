# Nashat TV — خطة النقل إلى الموبايل

الحالة المرجعية: Desktop v1.5.2 · Electron 33 + React 18 + TS 5 · ‏13,604 سطراً في `src/renderer` · 111 ملف TS/TSX.

---

## 0) ما تم التحقّق منه فعلياً قبل كتابة هذه الخطة

| الحقيقة | المصدر |
|---|---|
| تطبيق Android `com.nashat.tv` مُسجَّل في مشروع Firebase `nashat-tv` (ACTIVE) | `firebase_list_apps` |
| قاعدة البيانات نفسها مشتركة بين المنصّتين | `database.rules.json` + مفتاح i18n `auth.syncedWithAndroid` |
| Desktop مشتقّ جزئياً من Android الأصلي | تعليق في `src/main/services/streamExtractor.ts:56` — «Ported from Android KarwanScraper.java» |
| مشروع Android الأصلي مُستعاد | `C:\Users\nasha\Downloads\project\Project by Nashat\TV App` — 2,520 سطر Java، آخر بناء ٥ أيلول ٢٠٢٥ |
| **لا يوجد keystore إصدار — لم يُنشأ قطّ** | لا بلوك `signingConfigs` في `app/build.gradle.kts` · `outputs/apk/` فيه `debug` فقط · `versionCode = 1` |
| Android يستعمل **ExoPlayer** بالفعل | `app/build.gradle.kts` → `libs.exoplayer` · `PlayerActivity.java` 883 سطراً مع PiP |
| سطح التلامس مع Electron صغير جدّاً | `window.nashat` مُستعمَل في **17 ملفاً فقط** من 111 |
| التشغيل يعتمد مسارين منفصلين | Live TV → `hls.js` في `<video>` · Movies/Series → `<iframe>` لخوادم embed |

**الخلاصة العملية:** الجزء الأصعب ليس React — بل الطبقتان اللتان تعملان في Electron main process ولا وجود لهما في الموبايل.

---

## 1) الاختيار المعماري — ولماذا

### التوصية: **Capacitor + مُشغّل أصلي (Media3/ExoPlayer)**

| البديل | التكلفة | الحكم |
|---|---|---|
| **Capacitor** | إعادة استخدام ~90% من الـ renderer | ✅ **موصى به** |
| React Native / Expo | إعادة كتابة 18 صفحة + كل المكوّنات | ❌ |
| PWA فقط | شبه صفر | ❌ لا يحلّ أياً من العوائق الحقيقية |

**لماذا لا React Native رغم جاذبيته:**
صفحات Movies/Series تعمل عبر `<iframe>` على خوادم embed خارجية (`src/renderer/src/features/player/servers.ts`). في React Native ستحتاج `react-native-webview` لتشغيلها على أي حال — فتخسر الميزة الأساسية للـ RN وتدفع ثمن إعادة كتابة كامل الواجهة مقابل لا شيء.

**لماذا Capacitor وحده لا يكفي:**
الـ WebView لا يستطيع ضبط `Referer` أو `User-Agent` (هيدرات محظورة في المتصفّح). لذا تُستبدل طبقة التشغيل المباشر بمُشغّل أصلي — وهذا يحلّ ثلاث مشاكل دفعةً واحدة (الهيدرات + PiP + الصوت في الخلفية).

---

## 2) العوائق الحقيقية — بصراحة

### 🔴 عائق ١: حقن الهيدرات (يكسر Live TV بالكامل)

`src/main/security/streamHeaders.ts` يعترض كل طلب ويضبط:
- `Referer: https://karwan.tv/` + `Origin` لمقاطع karwan
- `User-Agent: VLC/3.0.18` لمضيفات IPTV مع حذف Referer/Origin

هذا مستحيل داخل WebView. المتصفّح يرفض تعديل هذه الهيدرات برمجيّاً، و`hls.js` لا يملك مخرجاً.

**الحل:** plugin أصلي حول **Media3/ExoPlayer**:
```kotlin
DefaultHttpDataSource.Factory()
    .setUserAgent(ua)
    .setDefaultRequestProperties(mapOf("Referer" to ref, "Origin" to origin))
```
ExoPlayer يدعم HLS و DASH و MP4 أصلاً — أي أنه يغطّي أيضاً حالة DASH التي يعجز عنها `hls.js` حالياً في سطح المكتب.

### 🔴 عائق ٢: تجاوز `X-Frame-Options` (يكسر Movies/Series)

`src/main/security/frameHeaders.ts` يجرّد قيود التأطير عن **22 مضيفاً**. مقابلاته:

| المنصّة | الإمكانية |
|---|---|
| Android WebView | ✅ عبر `shouldInterceptRequest` — إعادة جلب الاستجابة وتجريد الهيدر |
| iOS WKWebView | ❌ **لا يوجد مكافئ** |

**النتيجة:** على iOS ستُعطَّل صفحات Movies/Series عملياً ما لم يُبنَ proxy داخلي. هذا سبب إضافي لتأجيل iOS.

### 🟠 عائق ٣: متجر آبل

تطبيق محوره بثّ محتوى من خوادم embed طرف ثالث يقع تحت طائلة Guideline 5.2 (حقوق) و1.4.3. احتمال الرفض مرتفع جدّاً. Google Play أكثر تساهلاً لكنه ليس مضموناً.

**الموقف الموصى به:** Android أوّلاً، مع توزيع APK مباشر من الموقع (`nashat-tv.web.app`) كخطّة احتياطية مستقلّة عن المتجر. iOS يُدرَس لاحقاً وقد لا يكون مجدياً.

### 🟡 عائق ٤: ميزات لا معنى لها على الهاتف

| الميزة | المصير |
|---|---|
| Multi-Live (2×2 · 1+3 · 3×1) | تابلت فقط — تُخفى تحت 900px |
| اختصارات لوحة المفاتيح (`useGlobalShortcuts`) | تُعطَّل |
| Gamepad (`useGamepad`) | يُبقى — Android TV لاحقاً |
| System tray | يُحذف |
| مفاتيح الوسائط العامّة | تُستبدل بـ MediaSession (موجود أصلاً: `hooks/useMediaSession.ts` — 203 أسطر) |
| نافذة PiP المنفصلة (`ipc/pip.ts`) | تُستبدل بـ Android PiP الأصلي |

---

## 3) المراحل

### المرحلة ٠ — قرارات مُلزِمة (يوم واحد)

1. ~~هل تملك keystore تطبيق Android القديم؟~~ **مُجاب: لا يوجد ولم يُنشأ قطّ.** النسخة الوحيدة المُوزَّعة كانت `app-debug.apk` موقَّعة بمفتاح Android Studio التلقائي، والتطبيق لم يُنشر على Play. لا شيء يُفقد → **ابدأ من نظيف**.
2. معرّف الحزمة: الإبقاء على `com.nashat.tv` (تطبيق Firebase مُسجَّل ويعمل) أم `tv.nashat.mobile` للاتّساق مع `tv.nashat.pc`؟ الإبقاء أوفر — يوفّر إعادة تسجيل Firebase وتحديث `google-services.json`.
3. Android فقط، أم Android + iOS لاحقاً؟
4. متجر Play أم APK مباشر أم كلاهما؟

**عند أوّل بناء إصدار:** أنشئ keystore، خذ منه نسخة احتياطية خارج الجهاز فوراً، وفعّل Play App Signing عند النشر (مفتاح الرفع قابل لإعادة التعيين إن ضاع — مفتاح التوقيع لا).

### المرحلة ١ — فصل النواة المشتركة (٣–٥ أيام) · *أهم مرحلة*

الهدف: `src/renderer/src` يصبح محايداً تجاه المنصّة، وسطح المكتب يبقى يعمل دون انقطاع.

**١أ. واجهة منصّة تحلّ محلّ `window.nashat`:**
```ts
// src/core/platform/types.ts
export interface Platform {
  tmdbGet<T>(payload: TmdbInvokePayload): Promise<T>
  extractStream(pageUrl: string): Promise<ExtractedStream>
  googleSignIn(): Promise<{ idToken: string; accessToken: string }>
  openExternal(url: string): Promise<boolean>
  getAppVersion(): Promise<string>
  playNative?(url: string, headers?: Record<string, string>): Promise<void>
  openPip?(p: PipPayload): Promise<void>
  onMediaKey?(h: MediaKeyHandler): () => void
  setPresence?(p: PresencePayload): Promise<void>
}
```
تنفيذان: `platform/electron.ts` (تغليف `window.nashat`) و`platform/capacitor.ts`.

**١ب. الملفات الـ17 التي تحتاج تعديلاً** (`grep -rn "nashat" src/renderer`):

| الملف | عدد المواضع | ملاحظة |
|---|---|---|
| `features/library/api.ts` | 8 | الأثقل |
| `components/player/PlayerModal.tsx` | 4 | |
| `pages/Settings.tsx` · `components/layout/AppLayout.tsx` | 3 لكلٍّ | |
| `components/system/UpdateNotifier.tsx` | 2 | يُستبدل بمنطق متجر/APK |
| 12 ملفاً آخر | 1 لكلٍّ | تعديل سطر واحد |

**١ج. TMDB:** حالياً يمرّ عبر main process لإخفاء الـ Bearer token. على الموبايل لا يوجد main process — الرمز سينتهي داخل حزمة APK قابلة للفكّ. خياران:
- **(موصى به)** Cloud Function وسيطة: `nashat-tv.cloudfunctions.net/tmdb` — يُخفي الرمز فعلياً ويخدم المنصّتين.
- قبول انكشاف الرمز (رمز TMDB القراءة منخفض الخطورة، لكنه قابل لإساءة الاستعمال باسمك).

### المرحلة ٢ — هيكل Capacitor (٢–٣ أيام)

```
mobile/
├── capacitor.config.ts
├── android/
└── plugins/nashat-player/     ← plugin المُشغّل الأصلي
```
- `@capacitor/android` · `@capacitor/app` · `@capacitor/status-bar` · `@capacitor/splash-screen`
- إنتاج بناء renderer بهدف `mobile` عبر `vite build --mode mobile`
- **مهم:** حارس الأسرار في `electron.vite.config.ts` يجب أن يُطبَّق على بناء الموبايل أيضاً — نفس الخطأ الذي أطاح بـ v1.5.0 قابل للتكرار حرفياً هنا.

### المرحلة ٣ — plugin المُشغّل الأصلي (٣–٥ أيام) · *مخاطرة مُخفَّضة بعد استعادة المشروع*

**نقطة انطلاق جاهزة:** `PlayerActivity.java` (883 سطراً) في المشروع المُستعاد يحوي ExoPlayer + PiP مُنفَّذين بالفعل. العمل يصبح تغليفه في Capacitor plugin وإضافة حقن الهيدرات، لا بناءه من الصفر.

Java/Kotlin + Media3:
- تشغيل HLS/DASH/MP4 مع هيدرات مخصّصة ← **يحلّ عائق ١**
- Android PiP (`enterPictureInPictureMode`)
- MediaSession — إشعار التشغيل + أزرار السمّاعات
- الصوت في الخلفية (`foregroundServiceType="mediaPlayback"`)
- الترجمات: SRT/VTT عبر `SingleSampleMediaSource`
- سرعة التشغيل + اختيار الجودة (`TrackSelector`)

الجسر إلى React: نفس واجهة `VideoPlayer.tsx` الحالية حتى تبقى الصفحات كما هي.

### المرحلة ٤ — واجهة الموبايل (٥–٧ أيام)

- `Sidebar.tsx` (121 سطراً) ← شريط تبويب سفلي: الرئيسية · البثّ · أفلام · مسلسلات · مكتبتي
- 40 ملفاً يستعمل `hover:` ← إضافة حالات `active:` للّمس
- إيماءات المُشغّل: نقر مزدوج ±10ث · سحب عمودي للسطوع/الصوت · سحب أفقي للتقديم
- الشبكات: `grid-cols-2` على الهاتف بدل 5–6
- RTL: يعمل أصلاً (i18n ثلاثي اللغات جاهز: ar/en/ku)
- المناطق الآمنة: `env(safe-area-inset-*)`

### المرحلة ٥ — المصادقة والتكاملات (٢–٣ أيام)

- تدفّق OAuth عبر loopback (`src/main/ipc/auth.ts`) **لا يعمل** على Android → `@codetrix-studio/capacitor-google-auth` أو Credential Manager
- **يلزم تسجيل بصمة SHA-1/SHA-256** في Firebase (أداة `firebase_create_android_sha` متاحة)
- روابط عميقة: `nashattv://` + App Links لمشاركة الأفلام
- إشعارات FCM (اختياري): «حلقة جديدة» / «صديق دعاك لمشاهدة مشتركة»

### المرحلة ٦ — خوادم embed داخل WebView (٣–٥ أيام) · *أعلى مخاطرة عملية*

نقل منطق `frameHeaders.ts` إلى `WebViewClient.shouldInterceptRequest`، وترحيل قائمة adblock (~130 نطاقاً) من `src/main/security/adblock.ts` — الإعلانات المنبثقة أسوأ بكثير على الهاتف.

**قد تفشل هذه المرحلة كلّياً على بعض الخوادم.** خطّة بديلة: احتفظ بـ trailer fallback الموجود، واعرض رسالة صريحة بدل شاشة سوداء.

### المرحلة ٧ — الإصدار (٣–٥ أيام)

- keystore + توقيع (**نسخة احتياطية خارج الجهاز — فقدانه يعني فقدان مسار التحديث للأبد**)
- Play Console: 25$ مرّة واحدة · سياسة خصوصية · لقطات · Data Safety form
- إصدار APK على GitHub Releases بجانب مثبّت ويندوز
- تحديث `web/index.html` ليعرض زرّي تحميل: ويندوز + أندرويد

---

## 4) الجدول الزمني

| المرحلة | المدّة | المخاطرة |
|---|---|---|
| ٠ قرارات | ١ يوم | — |
| ١ فصل النواة | ٣–٥ أيام | 🟢 |
| ٢ هيكل Capacitor | ٢–٣ أيام | 🟢 |
| ٣ المُشغّل الأصلي | ٣–٥ أيام | 🟡 *(خُفِّضت — كود ExoPlayer مُستعاد)* |
| ٤ واجهة الموبايل | ٥–٧ أيام | 🟡 |
| ٥ المصادقة | ٢–٣ أيام | 🟡 |
| ٦ خوادم embed | ٣–٥ أيام | 🔴 |
| ٧ الإصدار | ٣–٥ أيام | 🟡 |
| **الإجمالي** | **٤–٦ أسابيع** بدوام جزئي | |

### ما يُستعاد من مشروع Android القديم

مسار المشروع: `C:\Users\nasha\Downloads\project\Project by Nashat\TV App`

| الأصل | الاستعمال |
|---|---|
| `PlayerActivity.java` (883 سطراً) | أساس plugin المُشغّل — ExoPlayer + PiP جاهزان (المرحلة ٣) |
| `LocaleManager.java` | معالجة ar/ckb/en + RTL على Android |
| `app/google-services.json` | ربط Firebase جاهز — يُنسخ كما هو إن أُبقي على `com.nashat.tv` |
| `channels.json` · `iq.m3u` · `kur.m3u` | قوائم القنوات الأصلية — للمقارنة مع ما في RTDB |
| `FirebaseChannelAdapter.java` | مرجع لمخطّط القنوات في RTDB |

**غير موجود فيه:** حقن الهيدرات، و`KarwanScraper.java` (رغم إشارة تعليق سطح المكتب إليه — نسخة أحدث لم تُحفظ). كلاهما متوفّر كاملاً في كود سطح المكتب.

**أقصر مسار لنسخة تجريبية صالحة:** المراحل ٠→١→٢→٣→٤ (~٣ أسابيع) تعطي تطبيقاً يعمل فيه Live TV والتصفّح والمكتبة والمزامنة. Movies/Series تُضاف في المرحلة ٦.

---

## 5) ما ينتقل مجّاناً وما لا ينتقل

**ينتقل كما هو (~90%):**
كل الصفحات الـ18 · Zustand stores · Firebase Auth/RTDB · شرائح الميزات (library · friends · dms · watchTogether · epg · stats · themes · recommendations) · i18n ثلاثي اللغات · Tailwind + Framer Motion · `useMediaSession`

**يحتاج تنفيذاً أصلياً:**
حقن الهيدرات · تشغيل الفيديو · PiP · Google sign-in · التحديث التلقائي · adblock · تجريد X-Frame-Options

**يُحذف:**
System tray · اختصارات لوحة المفاتيح · نافذة PiP المنفصلة · خادم localhost (`services/localServer.ts`)

---

## 6) قرار الالتزام بمخطّط RTDB

قواعد `database.rules.json` مشتركة مع تطبيق Android الحالي. أي تغيير في المخطّط يجب أن يبقى **متوافقاً للخلف**، وإلّا انكسرت مزامنة المستخدمين الحاليين. التعديل الأخير على `users/$uid/progress/$id` (قبول `kind: channel`) نموذج جيّد: توسيع لا استبدال.
