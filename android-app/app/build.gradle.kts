plugins {
    id("com.android.application")
}

val configuredWebAppUrl = providers.gradleProperty("WEB_APP_URL")
    .orElse("https://namma-veetu-samayal.cheenu.chatgpt.site/")
    .get()

require(configuredWebAppUrl.startsWith("https://")) {
    "WEB_APP_URL must use HTTPS"
}

android {
    namespace = "in.sahanabhakshanam.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "in.sahanabhakshanam.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField(
            "String",
            "WEB_APP_URL",
            "\"${configuredWebAppUrl.replace("\\", "\\\\").replace("\"", "\\\"")}\"",
        )
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
