---
title: 'UI Bug Fixes — Post Epic 7 Stabilization'
slug: 'ui-bug-fixes-post-epic7'
created: '2026-03-26'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack: ['React Native', 'Expo', 'react-native-paper', 'date-fns']
files_to_modify:
  - src/features/subscriptions/components/SubscriptionCard.tsx
  - src/features/subscriptions/components/SubscriptionListSkeleton.tsx
  - src/features/subscriptions/screens/SubscriptionDetailScreen.tsx
  - src/features/settings/screens/SettingsScreen.tsx
  - src/features/dashboard/components/CategoryBreakdown.tsx
  - src/features/bank/screens/BankConnectionScreen.tsx
  - src/features/bank/components/ConnectionStatusCard.tsx
  - src/features/bank/components/MatchSuggestionCard.tsx
  - src/features/settings/screens/MyDataScreen.tsx
  - src/features/notifications/screens/NotificationPermissionScreen.tsx
code_patterns: []
test_patterns: []
---

# Tech-Spec: UI Bug Fixes — Post Epic 7 Stabilization

**Created:** 2026-03-26

## Overview

### Problem Statement

Epic 7 tamamlandıktan sonra 7 UI hatası tespit edildi: (1) Subscriptions tab açılınca Expo Surface/overflow uyarısı, (2) tarihler MM/DD/YYYY formatında gösteriliyor (DD/MM/YYYY olmalı), (3) SegmentedButtons "1 day" butonunun sol çerçevesi kesik görünüyor, (4) Settings > Bank Connection sayfasında scroll çalışmıyor, (5) MatchSuggestionCard'daki match tag'leri taşıyor, (6) SubscriptionDetailScreen header'daki edit/delete IconButton'ları dikey hizalanmamış.

### Solution

Her dosyayı hedefli düzeltmelerle güncelle. Yeni mimari değişiklik yok — sadece mevcut bileşenlerdeki stil ve layout hataları giderilecek.

### Scope

**In Scope:**
- Surface/overflow uyarısını tetikleyen tüm bileşenlerde düzeltme
- Tüm `toLocaleDateString()` ve date-fns format string kullanımlarının tutarlı hale getirilmesi
- SegmentedButtons container'ına horizontal padding eklenmesi
- BankConnectionScreen'e ScrollView eklenmesi
- MatchSuggestionCard match tag layout iyileştirmesi (chip'lerin daha kompakt gösterimi)
- SubscriptionDetailScreen headerActions view'ına `alignItems: 'center'` eklenmesi

**Out of Scope:**
- Yeni özellikler
- Backend / Supabase değişiklikleri
- Test dosyaları güncellemeleri
- Navigasyon değişiklikleri

## Context for Development

### Codebase Patterns

- UI bileşenleri `react-native-paper` kullanıyor (Surface, Card, Button, IconButton, SegmentedButtons, Chip)
- Tarih formatı için `date-fns` (format, parseISO) kullanılıyor — `toLocaleDateString()` kullanımları tutarsız
- StyleSheet.create() pattern'i tüm dosyalarda kullanılıyor
- Header aksiyonları `navigation.setOptions({ headerRight: () => ... })` ile LayoutEffect içinde ayarlanıyor

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/subscriptions/components/SubscriptionCard.tsx` | Surface overflow uyarısı kaynağı (overflow: 'hidden' doğrudan Card style'a uygulanıyor) |
| `src/features/subscriptions/components/SubscriptionListSkeleton.tsx` | overflow: 'hidden' sorunu (line 114) |
| `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` | overflow: 'hidden' (line 693), date format, headerActions hizalama, SegmentedButtons |
| `src/features/settings/screens/SettingsScreen.tsx` | overflow: 'hidden' (line 603) |
| `src/features/dashboard/components/CategoryBreakdown.tsx` | overflow: 'hidden' (line 61) |
| `src/features/bank/screens/BankConnectionScreen.tsx` | ScrollView eksik, toLocaleDateString() kullanımı (line 309, 346) |
| `src/features/bank/components/ConnectionStatusCard.tsx` | toLocaleDateString() (line 25) |
| `src/features/bank/components/MatchSuggestionCard.tsx` | match tag layout sorunu |
| `src/features/settings/screens/MyDataScreen.tsx` | toLocaleDateString() (line 89) |
| `src/features/notifications/screens/NotificationPermissionScreen.tsx` | SegmentedButtons "1 day" border sorunu |

### Technical Decisions

1. **Tarih formatı**: `toLocaleDateString()` yerine `date-fns/format` ile `'dd/MM/yyyy'` pattern kullanılacak. `'MMMM d, yyyy'` (İngilizce ay ismi) olan yerler `'d MMMM yyyy'` olarak güncellenecek — bu Avrupa formatına uygundur ve cihaz locale'ine bağımlı değildir.

2. **Surface/overflow**: React Native Paper dökümantasyonuna göre, `Surface` bileşenine doğrudan `overflow: 'hidden'` uygulandığında gölge doğru render edilemiyor. Düzeltme: `overflow: 'hidden'` stilini `Surface`/`Card` yerine içerisi bir `View` bileşenine taşı.

3. **SegmentedButtons border**: Container View'a `paddingHorizontal: 1` veya `marginHorizontal: 1` eklemek ilk ve son butonun border'larının clipping'ini önler.

4. **BankConnectionScreen scroll**: `<View style={styles.container}>` yerine `<ScrollView contentContainerStyle={styles.scrollContent}>` kullan. WebView, preparing, processing flow state'leri değişmeden kalacak — scroll sadece info/connected state için gerekli.

5. **MatchSuggestionCard tag layout**: `reasonsRow` flexWrap zaten var ama chip'ler çok yer kaplıyor. Chip'lerin `compact` prop'u zaten var; `textStyle` ile font size'ı küçülterek veya chip'leri `size='small'` yaparak iyileştirme sağlanabilir. Ayrıca `matchChip` ("Possible Match") ile `reasonsRow` arasına daha az margin koyarak boşluk azaltılabilir.

6. **Header IconButton hizalama**: `headerActions` View'ına `alignItems: 'center'` eklenmesi yeterli.

## Implementation Plan

### Tasks

**T1 — Surface overflow uyarısını düzelt**
- Dosya: `src/features/subscriptions/components/SubscriptionCard.tsx`
  - `styles.card` içindeki `overflow: 'hidden'` kaldır
  - İçerik View'una (zaten mevcut: `styles.cardContent`) `overflow: 'hidden'` taşı
- Dosya: `src/features/subscriptions/components/SubscriptionListSkeleton.tsx`
  - `overflow: 'hidden'` olan style'ı bul (line 114), Surface/Card yerine inner View'a taşı
- Dosya: `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx`
  - `overflow: 'hidden'` olan style'ı bul (line 693), inner View'a taşı
- Dosya: `src/features/settings/screens/SettingsScreen.tsx`
  - `overflow: 'hidden'` (line 603), inner View'a taşı
- Dosya: `src/features/dashboard/components/CategoryBreakdown.tsx`
  - `overflow: 'hidden'` (line 61), inner View'a taşı

**T2 — Tarih formatını düzelt**
- Dosya: `src/features/bank/screens/BankConnectionScreen.tsx`
  - Line 309: `new Date(displayConnection.connectedAt).toLocaleDateString()` → `format(parseISO(displayConnection.connectedAt), 'dd/MM/yyyy')`
  - Line 346: `new Date(activeConnection.lastSyncedAt).toLocaleDateString()` → `format(parseISO(activeConnection.lastSyncedAt), 'dd/MM/yyyy')`
  - `date-fns` import ekle: `import { format, parseISO } from 'date-fns';`
- Dosya: `src/features/bank/components/ConnectionStatusCard.tsx`
  - `date.toLocaleDateString(undefined, {...})` → `format(date, 'dd/MM/yyyy')` veya `format(date, 'd MMM yyyy')`
  - `date-fns` import güncelle
- Dosya: `src/features/settings/screens/MyDataScreen.tsx`
  - Line 89: `new Date(user.created_at).toLocaleDateString()` → `format(parseISO(user.created_at), 'dd/MM/yyyy')`
  - `date-fns` import ekle
- Dosya: `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx`
  - Line 430: `format(parseISO(subscription.renewal_date), 'MMMM d, yyyy')` → `format(parseISO(subscription.renewal_date), 'd MMMM yyyy')`
  - Line 444: `format(parseISO(subscription.created_at), 'MMMM d, yyyy')` → `format(parseISO(subscription.created_at), 'd MMMM yyyy')`

**T3 — SegmentedButtons border clipping düzelt**
- Dosya: `src/features/notifications/screens/NotificationPermissionScreen.tsx`
  - `styles.segmentedButtons` içine `marginHorizontal: 2` ekle
- Dosya: `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx`
  - `styles.segmentedButtons` içine `marginHorizontal: 2` ekle
- Dosya: `src/features/subscriptions/screens/AddSubscriptionScreen.tsx`
  - Aynı düzeltme (tutarlılık için)
- Dosya: `src/features/subscriptions/screens/EditSubscriptionScreen.tsx`
  - Aynı düzeltme

**T4 — BankConnectionScreen scroll ekle**
- Dosya: `src/features/bank/screens/BankConnectionScreen.tsx`
  - `import { View, StyleSheet } from 'react-native'` → `ScrollView` ekle
  - Info/connected state return'ündeki outer `<View style={styles.container}>` → `<ScrollView contentContainerStyle={styles.scrollContent}>` olarak değiştir (sadece main info state, WebView/processing/preparing state'leri değişmez)
  - `styles.container` → `styles.scrollContent: { flexGrow: 1 }` olarak güncelle (veya ek style ekle)

**T5 — MatchSuggestionCard tag layout iyileştir**
- Dosya: `src/features/bank/components/MatchSuggestionCard.tsx`
  - `reasonsRow` style: `gap: 6` → `gap: 4` yap, `marginTop: 4` ekle
  - `MatchReasonChip` içindeki `<Chip compact ...>` bileşenine `textStyle={{ fontSize: 11 }}` ekle
  - `matchChip` style: `marginBottom: 8` → `marginBottom: 6`
  - Card.Actions style: `flexWrap: 'wrap'` zaten var, `gap: 4` ekle butonlar arasına

**T6 — Header IconButton hizalama düzelt**
- Dosya: `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx`
  - `styles.headerActions`: `{ flexDirection: 'row' }` → `{ flexDirection: 'row', alignItems: 'center' }` ekle

### Acceptance Criteria

**AC1 — Surface overflow uyarısı:**
- Given: Subscriptions tab'ı açıldığında
- When: Expo console logları izlendiğinde
- Then: "When setting overflow to hidden on Surface..." uyarısı görünmez

**AC2 — Tarih formatı:**
- Given: Bank connection sayfası, subscription detail, MyData, ConnectionStatusCard
- When: Herhangi bir tarih gösterildiğinde
- Then: Format DD/MM/YYYY veya "d MMMM yyyy" şeklinde görünür, MM/DD/YYYY formatı görünmez

**AC3 — SegmentedButtons:**
- Given: Notifications settings veya subscription detail sayfası
- When: SegmentedButtons bileşeni görüntülendiğinde
- Then: "1 day" butonunun sol border'ı tam ve kesintisiz görünür

**AC4 — Bank Connection scroll:**
- Given: Settings → Bank Connection sayfası
- When: Sayfa içeriği ekran yüksekliğini aşıyorsa
- Then: Sayfa yukarı/aşağı kaydırılabilir

**AC5 — MatchSuggestionCard tags:**
- Given: Detected subscriptions review sayfasındaki MatchSuggestionCard
- When: Kart görüntülendiğinde
- Then: Match reason tag'leri (Name Match, Amount Close, Same Cycle) kart genişliği içinde düzgün görünür, aşırı taşma olmaz

**AC6 — Header IconButton hizalama:**
- Given: Subscription detail sayfası header'ı
- When: Edit (pencil) ve delete (trash) ikonları görüntülendiğinde
- Then: Her iki ikon dikey olarak ortalanmış görünür

## Additional Context

### Dependencies

- `date-fns` — zaten kurulu
- `react-native-paper` — zaten kurulu
- `react-native` ScrollView — zaten kurulu

### Testing Strategy

Manuel test — emülatör veya fiziksel cihazda:
1. Expo console'da Surface uyarısı olmadığını kontrol et
2. Bank connection, subscription detail, my data sayfalarında tarihleri kontrol et
3. Notifications ve subscription detail'de SegmentedButtons görsel kontrolü
4. Bank connection sayfasında küçük ekranda scroll testi
5. Detected subscriptions review'da kart UI kontrolü
6. Subscription detail header'da ikon hizalamasını kontrol et

### Notes

- SegmentedButtons border sorunu react-native-paper'ın bilinen bir davranışı — `marginHorizontal` ile container'ı genişletmek border'ın kliplenmamasını sağlar
- BankConnectionScreen'de `flowState === 'webview'` ve `'preparing'` ve `'processing'` return'leri ScrollView'a çevrilmemeli — o state'ler tam ekran kullanıyor
- `toLocaleDateString()` kullanımları dinamik locale tespiti yapmıyor; `date-fns` ile sabit Avrupa formatı (DD/MM/YYYY) daha tutarlı ve güvenilir

---

## Implementation Notes (2026-03-26)

Bu bölüm, ikinci geliştirici oturumunda yapılan gerçek implementasyon kararlarını belgelemektedir. Orijinal spec'te bazı yaklaşımlar güncellendi.

### T3 — SegmentedButtons (Güncellendi)

`marginHorizontal: 2` yetersiz kaldı, `marginHorizontal: 4` kullanıldı.

`NotificationPermissionScreen`'de ek olarak wrapper `<View>` bileşenine `alignSelf: 'stretch'` eklendi ve `segmentedButtons` style'ı `alignSelf: 'stretch'` olarak güncellendi (`alignSelf: 'center'` + `maxWidth: '100%'` yerine). Bu, parent'ın `alignItems: 'center'`'ı ile çakışan davranışı düzeltti.

### T5 — MatchSuggestionCard (Güncellendi)

`Chip` component'i yeterince kompakt değildi. Çözüm: `Chip` → `View + Text` badge yaklaşımı. Etiketler kısaltıldı:
- `name_similar`: "Name Match" → **"Name"**
- `amount_close`: "Amount Close" → **"Amount"**
- `cycle_match`: "Same Cycle" → **"Cycle"**

Renk: `theme.colors.secondaryContainer` / `theme.colors.onSecondaryContainer` kullanıldı (tema uyumlu).

### T6 — Header IconButton (Güncellendi)

`alignItems: 'center'` tek başına yetmedi. `headerActions` View'una `height: 44` eklendi — React Navigation header content area'sıyla eşleşmesi için.

### T7 — Buton İçerik Hizalama (Yeni — Spec'te yoktu)

`minHeight: 44` olan tüm `Button` bileşenlerine `contentStyle={{ height: 44 }}` eklendi. `minHeight` dış container'ı büyütürken iç content container'ı aynı boyuta getirmiyordu; bu da içeriğin dikey olarak ortalanamadığı görünümüne yol açıyordu.

Etkilenen dosyalar:
- `ConnectionStatusCard.tsx` — 4 buton
- `MatchSuggestionCard.tsx` — 2 buton (Confirm Match, Not a Match)
- `NotificationPermissionScreen.tsx` — 3 buton
- `AddSubscriptionScreen.tsx` — `submitButtonContent: minHeight → height`
- `EditSubscriptionScreen.tsx` — aynı
- `SubscriptionDetailScreen.tsx` — `actionButtonContent: minHeight → height`

### T8 — DatePickerInput Locale (Yeni — Spec'te yoktu)

`AddSubscriptionScreen` ve `EditSubscriptionScreen`'deki `DatePickerInput` bileşenleri `locale="en"` (US: MM/DD/YYYY) kullanıyordu. `locale="en-GB"` (DD/MM/YYYY) olarak değiştirildi. `registerTranslation('en-GB', en)` eklendi — UI metinleri İngilizce kalmaya devam ediyor, sadece tarih gösterimi değişti.

### Test Güncellemeleri

- `MatchSuggestionCard.test.tsx` — chip accessibility label'ları güncellendi ("Name Match" → "Name" vb.)
- `SubscriptionDetailScreen.test.tsx` — tarih format beklentileri güncellendi ("March 15, 2026" → "15 March 2026" vb.)
