package com.rigoomarine.invoice.util;

import com.lowagie.text.Image;

import java.net.URL;

/**
 * Loads branding assets (logo, stamp) from {@code classpath:branding/}.
 *
 * Drop {@code logo.png} and {@code stamp.png} into
 * {@code invoice-module/src/main/resources/branding/} and the invoice + quotation
 * PDF generators pick them up automatically. Returns null on missing or unreadable
 * files so callers can fall back to text-only output.
 */
public final class BrandingAssetLoader {

    private static final String BRANDING_PATH = "branding/";

    private BrandingAssetLoader() {}

    public static Image loadLogo() {
        return loadFromClasspath("logo.png");
    }

    public static Image loadStamp() {
        return loadFromClasspath("stamp.png");
    }

    private static Image loadFromClasspath(String filename) {
        try {
            URL url = BrandingAssetLoader.class.getClassLoader().getResource(BRANDING_PATH + filename);
            if (url == null) {
                return null;
            }
            return Image.getInstance(url);
        } catch (Exception e) {
            return null;
        }
    }
}
