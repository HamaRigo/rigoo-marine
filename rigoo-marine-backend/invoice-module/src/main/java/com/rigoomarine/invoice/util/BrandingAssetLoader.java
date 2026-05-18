package com.rigoomarine.invoice.util;

import com.lowagie.text.Image;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;

public final class BrandingAssetLoader {

    private static final String BRANDING_PATH = "branding/";

    private BrandingAssetLoader() {}

    /**
     * Loads logo.png and composites every RGBA pixel onto white via pixel-by-pixel
     * alpha blending, producing a fully opaque RGB image — no transparency bleeds
     * into the PDF cell background.
     */
    public static Image loadLogo() {
        try {
            InputStream is = BrandingAssetLoader.class.getClassLoader()
                    .getResourceAsStream(BRANDING_PATH + "logo.png");
            if (is == null) return null;
            BufferedImage src = ImageIO.read(is);
            if (src == null) return null;
            int w = src.getWidth(), h = src.getHeight();
            BufferedImage dst = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int argb = src.getRGB(x, y);
                    int a = (argb >>> 24) & 0xFF;
                    int r = (argb >> 16) & 0xFF;
                    int g = (argb >>  8) & 0xFF;
                    int b =  argb        & 0xFF;
                    // blend with white: out = a*src + (1-a)*255
                    r = (a * r + (255 - a) * 255) / 255;
                    g = (a * g + (255 - a) * 255) / 255;
                    b = (a * b + (255 - a) * 255) / 255;
                    dst.setRGB(x, y, (r << 16) | (g << 8) | b);
                }
            }
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            ImageIO.write(dst, "png", bos);
            return Image.getInstance(bos.toByteArray());
        } catch (Exception e) {
            return null;
        }
    }

    public static Image loadStamp() {
        return loadFromClasspath("stamp.png");
    }

    public static Image loadWatermark() {
        return loadFromClasspath("logo.png");
    }

    private static Image loadFromClasspath(String filename) {
        try {
            URL url = BrandingAssetLoader.class.getClassLoader().getResource(BRANDING_PATH + filename);
            if (url == null) return null;
            return Image.getInstance(url);
        } catch (Exception e) {
            return null;
        }
    }
}
