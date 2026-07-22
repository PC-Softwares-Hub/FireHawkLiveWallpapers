<?php
// Enhanced Download proxy for Shared/Free Hosting
// Bypasses hotlink protection and handles large files by streaming

$url = isset($_GET['url']) ? $_GET['url'] : '';
$filename = isset($_GET['filename']) ? $_GET['filename'] : 'wallpaper.mp4';

// Basic security check
if (empty($url) || !str_contains($url, 'cloud.wallsflow.com/files/')) {
    http_response_code(400);
    die('Invalid URL.');
}

// Set headers for download
header('Content-Description: File Transfer');
header('Content-Type: video/mp4');
header('Content-Disposition: attachment; filename="' . basename($filename) . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');

// Use a context to fake the Referer and User-Agent
$options = array(
  'http' => array(
    'method' => "GET",
    'header' => "Referer: https://wallsflow.com/\r\n" .
                "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n"
  )
);

$context = stream_context_create($options);

// Stream the file directly from the remote server to the user
// This avoids memory limits on free hosts
$handle = fopen($url, 'rb', false, $context);
if ($handle) {
    while (!feof($handle)) {
        echo fread($handle, 8192);
        flush(); // Flush buffer to browser immediately
    }
    fclose($handle);
} else {
    // Fallback if fopen is disabled
    http_response_code(500);
    die('Could not open source file.');
}
?>