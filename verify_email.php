<?php
session_start();
require_once 'db_connection.php';

if (!isset($_GET['token']) || empty($_GET['token'])) {
    die("Invalid verification link.");
}

$token = mysqli_real_escape_string($conn, $_GET['token']);

$query = "SELECT * FROM users WHERE verification_token = '$token' 
          AND is_verified = 0 
          AND token_created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)";
$result = mysqli_query($conn, $query);

if (mysqli_num_rows($result) == 1) {
    $user = mysqli_fetch_assoc($result);
    $update = "UPDATE users SET is_verified = 1, verification_token = NULL, token_created_at = NULL WHERE id = " . $user['id'];
    if (mysqli_query($conn, $update)) {
        $_SESSION['success'] = "Email verified! You can now log in.";
        header("Location: login.php");
        exit();
    }
} else {
    echo "<h2>Link is invalid or expired.</h2>
          <p><a href='resend_verification.php'>Resend verification email</a></p>";
}
?>
