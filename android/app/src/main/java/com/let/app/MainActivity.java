package com.let.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.CookieManager;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private WebView webView;
    private String baseUrl = "https://letpractice.firebaseapp.com/";
    private static final String TAG = "MainActivity";
    private boolean isFirstLoad = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure WebView after the bridge is initialized
        this.getBridge().getWebView().post(() -> {
            configureWebView();
        });
        
        // Handle intent that started the activity
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }
    
    private void handleIntent(Intent intent) {
        if (intent == null || webView == null) return;
        
        String action = intent.getAction();
        Uri data = intent.getData();
        
        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            String url = data.toString();
            // Handle deep link - load it directly
            webView.loadUrl(url);
        }
    }
    
    private void configureWebView() {
        webView = this.getBridge().getWebView();
        if (webView == null) return;
        
        Log.d(TAG, "Configuring WebView");
        
        // Enable cookies globally
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        
        // Enable DOM storage and JavaScript
        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        
        // Cache settings - use cache but validate
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Enable mixed content for Firebase
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // Enable database for IndexedDB
        settings.setDatabaseEnabled(true);
        settings.setDatabasePath(getApplicationContext().getFilesDir().getPath());
        
        // Enable geolocation
        settings.setGeolocationEnabled(true);
        
        // Load the base URL
        webView.loadUrl(baseUrl);
        Log.d(TAG, "Loading base URL: " + baseUrl);
        
        // Set custom WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                Log.d(TAG, "shouldOverrideUrlLoading: " + url);
                
                // If it's the same base URL, handle internally
                if (url != null && (url.startsWith(baseUrl) || url.startsWith("https://letpractice.web.app"))) {
                    // For internal URLs, just return false to let WebView handle it
                    // This prevents full page reloads
                    return false;
                }
                
                // For external links, open in browser
                if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(browserIntent);
                    return true;
                }
                
                // Allow everything else
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                Log.d(TAG, "onPageStarted: " + url);
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.d(TAG, "onPageFinished: " + url);
                super.onPageFinished(view, url);
                
                // Flush cookies to persist them
                CookieManager.getInstance().flush();
                
                // Skip JS injection on first load to avoid issues
                if (!isFirstLoad) {
                    injectRoutingHandler(view);
                }
                isFirstLoad = false;
            }
        });
        
        // Enable back button navigation
        webView.setOnKeyListener((v, keyCode, event) -> {
            if (event.getAction() == android.view.KeyEvent.ACTION_DOWN) {
                if (keyCode == android.view.KeyEvent.KEYCODE_BACK) {
                    if (webView.canGoBack()) {
                        webView.goBack();
                        return true;
                    }
                }
            }
            return false;
        });
    }
    
    private void injectRoutingHandler(WebView view) {
        view.evaluateJavascript(
            "(function() {" +
            "  console.log('[WebView] Injecting routing handler');" +
            "  try {" +
            "    // Intercept link clicks" +
            "    document.addEventListener('click', function(e) {" +
            "      var link = e.target.closest('a');" +
            "      if (link) {" +
            "        var href = link.getAttribute('href');" +
            "        if (href && (href.startsWith('/') || href.indexOf('letpractice') !== -1)) {" +
            "          e.preventDefault();" +
            "          console.log('[WebView] Intercepted link:', href);" +
            "          // Use location.assign for internal navigation" +
            "          window.location.assign(href);" +
            "        }" +
            "      }" +
            "    }, true);" +
            "    console.log('[WebView] Routing handler injected');" +
            "  } catch(e) {" +
            "    console.log('[WebView] Error:', e);" +
            "  }" +
            "})();",
            null
        );
    }
}
