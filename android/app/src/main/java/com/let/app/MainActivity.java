package com.let.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private WebView webView;
    private String currentUrl = "";

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
        if (intent == null) return;
        
        String action = intent.getAction();
        Uri data = intent.getData();
        
        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            // Handle deep links
            String url = data.toString();
            if (webView != null) {
                // Load the deep link URL
                webView.loadUrl(url);
            }
        }
    }
    
    private void configureWebView() {
        webView = this.getBridge().getWebView();
        if (webView == null) return;
        
        // Enable DOM storage and JavaScript for proper routing
        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Enable mixed content for Firebase hosting
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        
        // Enable HTML5 geolocation
        settings.setGeolocationEnabled(true);
        
        // Set custom WebViewClient to handle routing
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // Skip if this is the same URL (prevent unnecessary reloads)
                if (url != null && url.equals(currentUrl)) {
                    return true;
                }
                
                // Handle deep links and internal navigation
                if (url != null && isInternalUrl(url)) {
                    // Check if it's a hash route (Next.js client-side routing)
                    if (url.contains("#")) {
                        // Handle hash routes - load the base URL and let JS handle routing
                        String baseUrl = url.split("#")[0];
                        if (!baseUrl.equals(currentUrl)) {
                            view.loadUrl(baseUrl);
                        }
                        return true;
                    }
                    // Allow internal navigation to proceed without full reload
                    return false;
                }
                
                // For external links, open in browser
                if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(browserIntent);
                    return true;
                }
                
                // Allow local file URLs and javascript
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                currentUrl = url;
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                currentUrl = url;
                
                // Simple JavaScript injection for History API handling
                // Keep it minimal to avoid client-side errors
                view.evaluateJavascript(
                    "(function() {" +
                    "  try {" +
                    "    var originalPushState = history.pushState;" +
                    "    history.pushState = function(state, title, url) {" +
                    "      originalPushState.call(history, state, title, url);" +
                    "      if (url && !url.startsWith('http')) {" +
                    "        window.location.hash = url;" +
                    "      }" +
                    "    };" +
                    "    var originalReplaceState = history.replaceState;" +
                    "    history.replaceState = function(state, title, url) {" +
                    "      originalReplaceState.call(history, state, title, url);" +
                    "      if (url && !url.startsWith('http')) {" +
                    "        window.location.hash = url;" +
                    "      }" +
                    "    };" +
                    "  } catch(e) {}" +
                    "})();",
                    null
                );
            }
        });
    }
    
    private boolean isInternalUrl(String url) {
        // Allow internal app navigation (Firebase Hosting URL and local files)
        return url != null && (
            url.startsWith("https://letpractice.firebaseapp.com") ||
            url.startsWith("https://letpractice.web.app") ||
            url.startsWith("file://") ||
            url.startsWith("javascript:") ||
            url.startsWith("about:blank") ||
            url.startsWith("data:") ||
            !url.startsWith("http")
        );
    }
}
