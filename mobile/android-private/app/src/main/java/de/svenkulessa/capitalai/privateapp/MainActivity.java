package de.svenkulessa.capitalai.privateapp;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;

public final class MainActivity extends Activity {
    private static final String APP_ORIGIN = "https://capital-ai.online";
    private static final String START_URL = APP_ORIGIN + "/mobile-scorer";
    private static final String MOBILE_LOGIN_URI = "capitalai-private://login";
    private static final SecureRandom RANDOM = new SecureRandom();
    private WebView webView;
    private String pendingVerifier;

    private static String base64Url(byte[] value) {
        return Base64.encodeToString(value, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private static String newVerifier() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return base64Url(bytes);
    }

    private static String challenge(String verifier) {
        try {
            return base64Url(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
        } catch (Exception error) {
            throw new IllegalStateException("PKCE unavailable", error);
        }
    }

    private void startExternalLogin() {
        pendingVerifier = newVerifier();
        Uri target = Uri.parse(APP_ORIGIN + "/api/auth/mobile-login")
            .buildUpon()
            .appendQueryParameter("challenge", challenge(pendingVerifier))
            .build();
        startActivity(new Intent(Intent.ACTION_VIEW, target));
    }

    private void handleIntent(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        if (uri == null || !"capitalai-private".equals(uri.getScheme()) || !"auth".equals(uri.getHost()) || !"/callback".equals(uri.getPath())) return;
        String code = uri.getQueryParameter("code");
        if (pendingVerifier == null || code == null || !code.matches("[A-Za-z0-9_-]{43}")) {
            pendingVerifier = null;
            if (webView != null) webView.loadUrl(START_URL);
            return;
        }
        String body = "code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
            + "&verifier=" + URLEncoder.encode(pendingVerifier, StandardCharsets.UTF_8);
        pendingVerifier = null;
        webView.postUrl(APP_ORIGIN + "/api/auth/mobile-exchange", body.getBytes(StandardCharsets.UTF_8));
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(false);
        webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.getSettings().setSafeBrowsingEnabled(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (MOBILE_LOGIN_URI.equals(uri.toString())) {
                    startExternalLogin();
                    return true;
                }
                return !("https".equals(uri.getScheme()) && "capital-ai.online".equals(uri.getHost()));
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
            }
        });

        if (state == null) webView.loadUrl(START_URL);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        pendingVerifier = null;
        if (webView != null) {
            webView.stopLoading();
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
