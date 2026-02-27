package com.let.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import android.os.AsyncTask;
import android.os.Environment;
import androidx.core.content.FileProvider;
import android.content.pm.PackageManager;
import android.Manifest;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.pm.PackageInfo;

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
            injectAppVersion();
        });
        
        // Handle intent that started the activity
        handleIntent(getIntent());
    }
    
    // Inject app version into WebView for auto-update checking
    private void injectAppVersion() {
        try {
            PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            String versionName = pInfo.versionName;
            int versionCode = pInfo.versionCode;
            
            Log.d(TAG, "App version: " + versionName + " (" + versionCode + ")");
            
            if (webView != null) {
                String js = "window.appVersion = '" + versionName + "'; " +
                           "window.appVersionCode = " + versionCode + "; " +
                           "console.log('[MainActivity] App version injected: " + versionName + "');";
                webView.evaluateJavascript(js, null);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to inject app version: " + e.getMessage());
        }
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
        
        // Add JavaScript interface for self-update functionality
        webView.addJavascriptInterface(this, "android");
        Log.d(TAG, "JavaScript interface added as 'android'");
        
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
    
    // ========== SELF-UPDATE FEATURE ==========
    
    @JavascriptInterface
    public void checkForUpdate(String updateUrl, String expectedSha256) {
        Log.d(TAG, "checkForUpdate called with URL: " + updateUrl);
        new DownloadUpdateTask(updateUrl, expectedSha256).execute();
    }
    
    private class DownloadUpdateTask extends AsyncTask<Void, Integer, String> {
        private String updateUrl;
        private String expectedSha256;
        private String errorMessage = null;
        
        public DownloadUpdateTask(String updateUrl, String expectedSha256) {
            this.updateUrl = updateUrl;
            this.expectedSha256 = expectedSha256;
        }
        
        @Override
        protected String doInBackground(Void... params) {
            try {
                Log.d(TAG, "Starting download from: " + updateUrl);
                
                URL url = new URL(updateUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(30000);
                connection.setReadTimeout(30000);
                connection.connect();
                
                int responseCode = connection.getResponseCode();
                Log.d(TAG, "Download response code: " + responseCode);
                
                if (responseCode != HttpURLConnection.HTTP_OK) {
                    errorMessage = "Server returned code: " + responseCode;
                    return null;
                }
                
                // Get file size
                int fileLength = connection.getContentLength();
                Log.d(TAG, "File size: " + fileLength + " bytes");
                
                // Create download directory
                File downloadDir = new File(getExternalFilesDir(null), "updates");
                if (!downloadDir.exists()) {
                    downloadDir.mkdirs();
                }
                
                // Delete old APK if exists
                File apkFile = new File(downloadDir, "app-update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }
                
                // Download the file
                InputStream input = connection.getInputStream();
                FileOutputStream output = new FileOutputStream(apkFile);
                
                byte[] buffer = new byte[4096];
                int total = 0;
                int count;
                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    if (fileLength > 0) {
                        publishProgress((int) (total * 100 / fileLength));
                    }
                    output.write(buffer, 0, count);
                }
                
                output.close();
                input.close();
                connection.disconnect();
                
                Log.d(TAG, "Download complete, SHA256 verification skipped");
                
                return apkFile.getAbsolutePath();
                
            } catch (Exception e) {
                Log.e(TAG, "Download error: " + e.getMessage());
                errorMessage = "Download failed: " + e.getMessage();
                return null;
            }
        }
        
        @Override
        protected void onProgressUpdate(Integer... values) {
            Log.d(TAG, "Download progress: " + values[0] + "%");
            // Send progress to WebView
            if (webView != null) {
                String js = "window.dispatchEvent(new CustomEvent('updateProgress', {detail: " + values[0] + "}))";
                webView.evaluateJavascript(js, null);
            }
        }
        
        @Override
        protected void onPostExecute(String apkPath) {
            if (apkPath != null) {
                Log.d(TAG, "Download successful, prompting install...");
                promptInstall(apkPath);
            } else {
                Log.e(TAG, "Download failed: " + errorMessage);
                sendUpdateResult("error", errorMessage);
            }
        }
    }
    
    private String calculateSha256(File file) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        FileInputStream fis = new FileInputStream(file);
        byte[] dataBytes = new byte[1024];
        int nread = 0;
        while ((nread = fis.read(dataBytes)) != -1) {
            md.update(dataBytes, 0, nread);
        }
        fis.close();
        
        byte[] mdbytes = md.digest();
        StringBuilder sb = new StringBuilder();
        for (byte mdbyte : mdbytes) {
            sb.append(String.format("%02x", mdbyte));
        }
        return sb.toString();
    }
    
    private void promptInstall(String apkPath) {
        runOnUiThread(() -> {
            try {
                File apkFile = new File(apkPath);
                
                // Check if file exists and is readable
                if (!apkFile.exists()) {
                    throw new Exception("APK file not found: " + apkPath);
                }
                
                Log.d(TAG, "APK file exists, size: " + apkFile.length() + " bytes");
                
                Uri apkUri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".fileprovider",
                    apkFile
                );
                
                Log.d(TAG, "APK URI created: " + apkUri.toString());
                
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                
                // Grant permission to the package installer
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                
                // Check if there's an app that can handle this intent
                if (intent.resolveActivity(getPackageManager()) != null) {
                    startActivity(intent);
                    sendUpdateResult("success", "Update downloaded! Tap 'Install' when prompted.");
                } else {
                    throw new Exception("No app found to handle APK installation");
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Install error: " + e.getMessage(), e);
                sendUpdateResult("error", "Failed to install: " + e.getMessage());
            }
        });
    }
    
    private void sendUpdateResult(String status, String message) {
        if (webView != null) {
            String js = "window.dispatchEvent(new CustomEvent('updateResult', {detail: " +
                "JSON.stringify({status: '" + status + "', message: '" + message + "'})" +
                "}))";
            webView.evaluateJavascript(js, null);
        }
    }
}
