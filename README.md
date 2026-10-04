# Asistanım ✨

Günlük yapman ve unutmaman gereken her şeyi not alan, zamanı gelince hatırlatan, **sesle konuşabildiğin** kişisel asistan uygulaması. Expo (React Native) ile yazıldı; Android ve iOS'ta çalışır.

## Neler yapabiliyor?

- **Doğal Türkçe ile görev ekleme.** Yazarak ya da konuşarak:
  - "Yarın sabah 9'da ilaç içmeyi hatırlat"
  - "Her gün 22:00'de dişlerimi fırçala"
  - "Hafta içi sabah 7 buçukta spor"
  - "Her pazartesi 10'da haftalık toplantı"
  - "Yarım saat sonra fırını kapat"
  - "15 ekim doktor randevusu saat 11.30"

  Yazarken neyi anladığını (tarih, saat, tekrar, kategori) canlı olarak gösterir.
- **Sesli asistan.** Mikrofona dokunup konuşursun, asistan anlar, işlemi yapar ve yanıtı sesli okur:
  - "Bugün ne var?" / "Yarın neler var?" / "Bu hafta planım ne?"
  - "Not al: wifi şifresi kapının arkasında" / "Notlarımı oku"
  - "Süt al bitti" (görevi tamamlar) / "Sil market" (görevi siler)
- **Gerçek hatırlatmalar.** Telefonun yerel bildirimleri kullanılır, bu yüzden uygulama kapalıyken de bildirim gelir. Bildirimin üzerindeki **✅ Tamamlandı** ve **⏰ 10 dk ertele** düğmeleri çalışır. İstersen 5, 15, 30 dk veya 1 saat önceden hatırlatır.
- **Sabah özeti.** Her sabah seçtiğin saatte günün planını bildirim olarak gönderir.
- **Rutinler.** Görevler her gün, hafta içi, her hafta veya her ay tekrarlanabilir. Tamamlanma durumu her gün için ayrı tutulur.
- **Notlar.** Renkli kartlar, sabitleme ve arama.
- **Otomatik kategori.** "ilaç" Sağlık 💊, "toplantı" İş 💼, "market" Alışveriş 🛒 olarak otomatik renklendirilir.
- **Tasarım.** Koyu aurora arka plan, nefes alan ve sesine tepki veren asistan küresi, günlük ilerleme halkası ve cam efektli yüzen menü.

Tüm veriler **yalnızca telefonunda** saklanır. Hesap ya da sunucu gerekmez.

## Hızlı başlangıç

```bash
npm install
npx expo start
```

### 1) Expo Go ile hızlı deneme
Telefona **Expo Go** uygulamasını kur ve terminaldeki QR kodunu okut. Arayüz, görevler, notlar, sesli yanıtlar ve bildirimler çalışır.

> **Not:** Konuşma tanıma (sesli komut) yerel bir modül olduğu için Expo Go'da bulunmaz. Expo Go'da klavyedeki 🎤 dikte tuşuyla konuşarak yazabilirsin. Tam sesli deneyim için aşağıdaki development build'i kullan.

### 2) Development build ile tam deneyim (önerilir)
```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # APK üretir
npx expo start --dev-client
```
Android'de APK'yı telefona kurman yeterli. Yerel derleme yapmak istersen `npx expo run:android` veya `npx expo run:ios` da kullanabilirsin.

### 3) Kendi kullanımın için kurulum dosyası
```bash
eas build --profile preview --platform android   # paylaşılabilir APK
```

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm start` | Geliştirme sunucusunu başlatır |
| `npm test` | Türkçe ayrıştırıcı testlerini çalıştırır |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |

## Proje yapısı

```
src/
  app/                    Expo Router ekranları
    (tabs)/index.tsx      Bugün: ilerleme halkası, sıradaki görev, hızlı ekleme
    (tabs)/plan.tsx       21 günlük takvim şeridi ve rutinler
    (tabs)/notes.tsx      Notlar
    (tabs)/settings.tsx   Bildirim, ses ve profil ayarları
    assistant.tsx         Sesli asistan (tam ekran)
    task.tsx              Görev ekleme/düzenleme
    welcome.tsx           İlk açılış
  components/             VoiceOrb, Aurora, ProgressRing, TaskRow, TabBar…
  lib/
    parser.ts             Türkçe doğal dil ayrıştırıcı (tarih/saat/tekrar/niyet)
    assistant.ts          Komutları işleyip yanıt üreten asistan
    notifications.ts      Bildirim planlama, eylem düğmeleri, erteleme
    voice.ts              Konuşma tanıma + sesli okuma
    store.ts              AsyncStorage ile kalıcı durum
    schedule.ts           Tekrar kuralları, gecikmiş/yaklaşan hesapları
tests/parser.test.ts      Ayrıştırıcı testleri
```

## Bildirimler nasıl çalışır?

Tekrarlayan görevler için sistemin "her gün tekrarla" tetikleyicisi yerine, önümüzdeki 30 günün her hatırlatması tek tek planlanır. Bu sayede bir günü tamamladığında o günün bildirimi susar ama ertesi gün yine gelir. iOS aynı anda en fazla 64 bekleyen bildirime izin verdiği için en yakın 52 hatırlatma ve 7 sabah özeti planlanır. Uygulamayı her açtığında bu liste otomatik olarak yenilenir.

Android 12 ve sonrasında hatırlatmaların dakikası dakikasına gelmesi için **Ayarlar → Uygulamalar → Asistanım → Alarmlar ve hatırlatıcılar** iznini açık tut.
