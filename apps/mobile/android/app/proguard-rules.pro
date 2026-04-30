# ============================================================================
# ProGuard / R8 keep rules for Academyflo
#
# Each block exists because the corresponding library uses reflection,
# JNI, or asset-based lookup that R8 cannot trace statically. Without
# these rules, the release AAB compiles fine but crashes at runtime with
# ClassNotFoundException / NoSuchMethodError on the first feature use.
# ============================================================================

# ---- React Native core (Hermes is enabled) ---------------------------------
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# Native modules look up Java classes by reflection through JNI.
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod *; }
-keepclasseswithmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclasseswithmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

# ---- React Navigation / react-native-screens -------------------------------
-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.rnscreens.**

# ---- react-native-safe-area-context ---------------------------------------
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.th3rdwave.safeareacontext.**

# ---- react-native-gesture-handler -----------------------------------------
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# ---- react-native-firebase / messaging ------------------------------------
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-dontwarn com.google.firebase.**
-dontwarn io.invertase.firebase.**

# Firebase uses GSON-style reflection to deserialize default types.
-keepclassmembers class * {
  @com.google.firebase.messaging.RemoteMessage <fields>;
}

# ---- Sentry ----------------------------------------------------------------
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**
-keep class com.getsentry.** { *; }

# ---- Cashfree PG SDK -------------------------------------------------------
# Cashfree uses runtime reflection on its callback contract. Stripping any
# part of the SDK package will cause the payment sheet to fail silently.
-keep class com.cashfree.** { *; }
-keep interface com.cashfree.** { *; }
-keep class com.gocashfree.** { *; }
-keep class com.cashfree.pg.** { *; }
-keep class com.reactnativecashfreepgsdk.** { *; }
-dontwarn com.cashfree.**
-dontwarn com.gocashfree.**
-dontwarn com.reactnativecashfreepgsdk.**

# ---- react-native-keychain (BouncyCastle / Cipher provider lookup) --------
-keep class com.oblador.keychain.** { *; }
-dontwarn com.oblador.keychain.**
# BouncyCastle provider classes are loaded by name on Android.
-keep class org.bouncycastle.** { *; }
-dontwarn org.bouncycastle.**

# ---- react-native-image-picker --------------------------------------------
-keep class com.imagepicker.** { *; }
-dontwarn com.imagepicker.**

# ---- react-native-fs -------------------------------------------------------
-keep class com.rnfs.** { *; }
-dontwarn com.rnfs.**

# ---- react-native-share ----------------------------------------------------
-keep class cl.json.** { *; }
-dontwarn cl.json.**

# ---- react-native-svg ------------------------------------------------------
-keep class com.horcrux.svg.** { *; }
-dontwarn com.horcrux.svg.**

# ---- react-native-linear-gradient -----------------------------------------
-keep class com.BV.LinearGradient.** { *; }
-dontwarn com.BV.LinearGradient.**

# ---- react-native-vector-icons -------------------------------------------
# Icons themselves are bundled fonts (under assets/), not classes. Vector-icons
# does have a small Java surface that reflects on resources at lookup time —
# keep it just in case the upstream library decides to JNI-call into it.
-keep class com.oblador.vectoricons.** { *; }
-dontwarn com.oblador.vectoricons.**

# ---- OkHttp / Okio (used transitively by RN networking + Firebase) --------
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**

# ---- Kotlin metadata (some RN libs ship Kotlin) ---------------------------
-keep class kotlin.Metadata { *; }
-keep class kotlin.reflect.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# ---- Suppress warnings for missing optional crypto providers --------------
-dontwarn javax.annotation.**
-dontwarn java.lang.invoke.StringConcatFactory

# ---- Keep generic signatures + annotations (needed for Gson, Moshi, etc.)--
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes SourceFile,LineNumberTable

# ---- Remove android.util.Log calls in release builds ----------------------
# (We've also __DEV__-guarded JS-side console calls; this strips any native
# Log.d/v/i calls that R8 sees.)
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
