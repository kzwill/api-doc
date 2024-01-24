package com.uino.idt.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang3.time.DateUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;

@Slf4j
public class AesUtilForX {

    private static DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        /**
         * encrypt
         *
         * @param sKey The aes-128-ecb encryption mode is used. The key must be 16 bits
         * @param sSrc String to encrypt
         */
    public static String encryptV1(String sKey, String sSrc) {
        checkKey(sKey);
        try {

            byte[] raw = sKey.getBytes(StandardCharsets.UTF_8);
            SecretKeySpec sKeySpec = new SecretKeySpec(raw, "AES");

            // Algorithm/pattern/complement modeÏ
            Cipher cipher = null;
            cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");

            cipher.init(Cipher.ENCRYPT_MODE, sKeySpec);
            byte[] encrypted = cipher.doFinal(sSrc.getBytes(StandardCharsets.UTF_8));

            // Here, BASE64 is used for transcoding, and it encrypts twice.
            return new Base64().encodeToString(encrypted);
        } catch (Exception e) {
            log.error(">>> encrypt error : ", e);
            return null;
        }
    }

        /**
         * decrypt
         *
         * @param sKey The aes-128-ecb encryption mode is used. The key must be 16 bits
         * @param sSrc String to decrypt
         */
    public static String decryptV1(String sKey, String sSrc) {
        try {
            checkKey(sKey);
            byte[] raw = sKey.getBytes(StandardCharsets.UTF_8);
            SecretKeySpec sKeySpec = new SecretKeySpec(raw, "AES");
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, sKeySpec);

            // Decrypt with Base64 first
            byte[] encrypted1 = new Base64().decode(sSrc);
            try {
                byte[] original = cipher.doFinal(encrypted1);
                return new String(original, StandardCharsets.UTF_8);
            } catch (Exception e) {
                System.out.println(e.toString());
                return null;
            }
        } catch (Exception ex) {
            System.out.println(ex.toString());
            return null;
        }
    }

        /**
         * verify that the key conforms to the specification
         *
         * @param sKey key
         */
    private static void checkKey(String sKey) {
        // Check whether the Key is correct
        if (sKey == null) {
            throw new IllegalArgumentException("key is null");
        }
        // Check whether the Key is 16 bits
        if (sKey.length() != 16) {
            throw new IllegalArgumentException("key length is not 16 bits");
        }
    }


    public static String encryptV2(String username, String cSrc) {
        String format = dateFormat.format(new Date());
        String cKey = DigestUtils.sha256Hex(username + "_" + format);
        if (cKey.length() - username.length() < 16) {
            cKey = cKey.substring(cKey.length() - 16);
        } else {
            cKey = cKey.substring(username.length(), username.length() + 16);
        }
        String enString = encryptV1(cKey, cSrc);
        return enString;
    }

    public static String decryptV2(String username, String cSrc) {
        String format = dateFormat.format(new Date());
        String cKey = DigestUtils.sha256Hex(username + "_" + format);
        if (cKey.length() - username.length() < 16) {
            cKey = cKey.substring(cKey.length() - 16);
        } else {
            cKey = cKey.substring(username.length(), username.length() + 16);
        }
        String enString = decryptV1(cKey, cSrc);
        if (enString == null) {
            Date date = DateUtils.addMinutes(new Date(), -5);
            cKey = DigestUtils.sha256Hex(username + "_" + dateFormat.format(date));
            if (cKey.length() - username.length() < 16) {
                cKey.substring(cKey.length() - 16);
            } else {
                cKey = cKey.substring(username.length(), username.length() + 16);
            }
            enString = decryptV1(cKey, cSrc);
        }
        return enString;
    }

    public static void main(String[] args) {
        String str1 = encryptV2("admin","Thing@123");
        System.out.println("加密后："+str1);

        String str2 = decryptV2("admin",str1);
        System.out.println(str2);
    }

}
