# Supabase Email Templates — movieranker.win

Copy and paste these templates directly into the **Supabase Dashboard** under **Authentication → Email Templates**.

---

## 1. Confirm Sign Up

* **Supabase Template:** `Confirm signup`
* **Subject:** `✦ Welcome to movieranker — Confirm your admission`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Admission</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ececf1;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0d0d10;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#17171c;border:1px solid #2a2a35;border-top:3px solid #f5c518;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 32px 16px 32px;">
              <div style="font-size:24px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#ececf1;">
                <span style="color:#f5c518;">✦</span> MOVIERANKER
              </div>
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b8b94;margin-top:4px;">
                Admit One · Premiere Access
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:16px 32px 24px 32px;text-align:center;">
              <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">Welcome to the Premiere!</h1>
              <p style="font-size:14px;line-height:22px;color:#8b8b94;margin:0 0 24px 0;">
                You're one step away from ranking cinema, settling film debates, and claiming your custom <strong style="color:#f5c518;">@handle</strong>. Confirm your email address to get your admission pass.
              </p>
              <!-- Primary CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="border-radius:9999px;background-color:#f5c518;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#0d0d10;text-decoration:none;border-radius:9999px;">
                      ✦ Confirm Admission
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Alternative OTP Code -->
              <p style="font-size:12px;color:#8b8b94;margin:0 0 8px 0;">Or enter this 6-digit confirmation code:</p>
              <div style="display:inline-block;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:6px;color:#f5c518;background-color:#0d0d10;padding:10px 20px;border-radius:8px;border:1px dashed rgba(245,197,24,0.4);">
                {{ .Token }}
              </div>
              <p style="font-size:11px;color:#6b6b75;margin:24px 0 0 0;line-height:18px;">
                If you didn't request this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#121216;border-top:1px solid #22222a;padding:20px 32px;text-align:center;font-size:11px;color:#6b6b75;line-height:18px;">
              movieranker.win · Curate, debate, and rank the films you love.<br>
              Need help? Contact <a href="mailto:admin@movieranker.win" style="color:#f5c518;text-decoration:none;">admin@movieranker.win</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Invite User

* **Supabase Template:** `Invite user`
* **Subject:** `✦ You've been invited to join movieranker`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ececf1;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0d0d10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#17171c;border:1px solid #2a2a35;border-top:3px solid #f5c518;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td align="center" style="padding:32px 32px 16px 32px;">
              <div style="font-size:24px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#ececf1;">
                <span style="color:#f5c518;">✦</span> MOVIERANKER
              </div>
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b8b94;margin-top:4px;">
                Special Invitation · Film Room
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;text-align:center;">
              <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">You're Invited to Rank Movies!</h1>
              <p style="font-size:14px;line-height:22px;color:#8b8b94;margin:0 0 24px 0;">
                A fellow cinephile has invited you to join <strong style="color:#ececf1;">Movieranker</strong>. Build head-to-head rankings, pit classics against modern masterpieces, and share your definitive lists.
              </p>
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="border-radius:9999px;background-color:#f5c518;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#0d0d10;text-decoration:none;border-radius:9999px;">
                      ✦ Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:11px;color:#6b6b75;margin:24px 0 0 0;line-height:18px;">
                If you weren't expecting this invite, you can safely ignore this message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#121216;border-top:1px solid #22222a;padding:20px 32px;text-align:center;font-size:11px;color:#6b6b75;line-height:18px;">
              movieranker.win · Curate, debate, and rank the films you love.<br>
              Questions? Contact <a href="mailto:admin@movieranker.win" style="color:#f5c518;text-decoration:none;">admin@movieranker.win</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Magic Link & Passwordless OTP

* **Supabase Template:** `Magic Link`
* **Subject:** `✦ Your movieranker sign-in ticket`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ececf1;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0d0d10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#17171c;border:1px solid #2a2a35;border-top:3px solid #f5c518;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td align="center" style="padding:32px 32px 16px 32px;">
              <div style="font-size:24px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#ececf1;">
                <span style="color:#f5c518;">✦</span> MOVIERANKER
              </div>
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b8b94;margin-top:4px;">
                Instant Sign-In Ticket
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;text-align:center;">
              <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">Your Pass to the Cutting Room</h1>
              <p style="font-size:14px;line-height:22px;color:#8b8b94;margin:0 0 24px 0;">
                Click below to sign in instantly to your account with no password required:
              </p>
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="border-radius:9999px;background-color:#f5c518;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#0d0d10;text-decoration:none;border-radius:9999px;">
                      ✦ Sign In to Movieranker
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:12px;color:#8b8b94;margin:0 0 8px 0;">Or enter this 6-digit login code:</p>
              <div style="display:inline-block;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:6px;color:#f5c518;background-color:#0d0d10;padding:10px 20px;border-radius:8px;border:1px dashed rgba(245,197,24,0.4);">
                {{ .Token }}
              </div>
              <p style="font-size:11px;color:#6b6b75;margin:24px 0 0 0;line-height:18px;">
                This link expires shortly. If you did not request this sign-in, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#121216;border-top:1px solid #22222a;padding:20px 32px;text-align:center;font-size:11px;color:#6b6b75;line-height:18px;">
              movieranker.win · Curate, debate, and rank the films you love.<br>
              Need assistance? Contact <a href="mailto:admin@movieranker.win" style="color:#f5c518;text-decoration:none;">admin@movieranker.win</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Change Email Address

* **Supabase Template:** `Change email address`
* **Subject:** `✦ Confirm your new email address for movieranker`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Email Change</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ececf1;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0d0d10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#17171c;border:1px solid #2a2a35;border-top:3px solid #f5c518;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td align="center" style="padding:32px 32px 16px 32px;">
              <div style="font-size:24px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#ececf1;">
                <span style="color:#f5c518;">✦</span> MOVIERANKER
              </div>
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b8b94;margin-top:4px;">
                Account Security · Email Update
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;text-align:center;">
              <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">Update Your Email Address</h1>
              <p style="font-size:14px;line-height:22px;color:#8b8b94;margin:0 0 24px 0;">
                You requested to change the email associated with your movieranker account to <strong style="color:#f5c518;">{{ .NewEmail }}</strong>. Click below to verify and complete the transfer:
              </p>
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="border-radius:9999px;background-color:#f5c518;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#0d0d10;text-decoration:none;border-radius:9999px;">
                      ✦ Confirm Email Change
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:12px;color:#8b8b94;margin:0 0 8px 0;">Or enter this confirmation code:</p>
              <div style="display:inline-block;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:6px;color:#f5c518;background-color:#0d0d10;padding:10px 20px;border-radius:8px;border:1px dashed rgba(245,197,24,0.4);">
                {{ .Token }}
              </div>
              <p style="font-size:11px;color:#6b6b75;margin:24px 0 0 0;line-height:18px;">
                If you did not request this change, please log in immediately and secure your account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#121216;border-top:1px solid #22222a;padding:20px 32px;text-align:center;font-size:11px;color:#6b6b75;line-height:18px;">
              movieranker.win · Curate, debate, and rank the films you love.<br>
              Need help? Contact <a href="mailto:admin@movieranker.win" style="color:#f5c518;text-decoration:none;">admin@movieranker.win</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Reset Password

* **Supabase Template:** `Reset password`
* **Subject:** `✦ Reset your movieranker password`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ececf1;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0d0d10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#17171c;border:1px solid #2a2a35;border-top:3px solid #f5c518;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td align="center" style="padding:32px 32px 16px 32px;">
              <div style="font-size:24px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#ececf1;">
                <span style="color:#f5c518;">✦</span> MOVIERANKER
              </div>
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b8b94;margin-top:4px;">
                Security Key · Reset Password
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;text-align:center;">
              <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">Reset Your Password</h1>
              <p style="font-size:14px;line-height:22px;color:#8b8b94;margin:0 0 24px 0;">
                We received a request to reset the password for your movieranker account. Click the button below to choose a new password:
              </p>
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="border-radius:9999px;background-color:#f5c518;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#0d0d10;text-decoration:none;border-radius:9999px;">
                      ✦ Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:12px;color:#8b8b94;margin:0 0 8px 0;">Or enter this reset token:</p>
              <div style="display:inline-block;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:6px;color:#f5c518;background-color:#0d0d10;padding:10px 20px;border-radius:8px;border:1px dashed rgba(245,197,24,0.4);">
                {{ .Token }}
              </div>
              <p style="font-size:11px;color:#6b6b75;margin:24px 0 0 0;line-height:18px;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#121216;border-top:1px solid #22222a;padding:20px 32px;text-align:center;font-size:11px;color:#6b6b75;line-height:18px;">
              movieranker.win · Curate, debate, and rank the films you love.<br>
              Need assistance? Contact <a href="mailto:admin@movieranker.win" style="color:#f5c518;text-decoration:none;">admin@movieranker.win</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 6. Reauthentication

* **Supabase Template:** `Reauthentication`
* **Subject:** `✦ Confirm your identity on movieranker`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Reauthentication</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ececf1;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0d0d10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#17171c;border:1px solid #2a2a35;border-top:3px solid #f5c518;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td align="center" style="padding:32px 32px 16px 32px;">
              <div style="font-size:24px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#ececf1;">
                <span style="color:#f5c518;">✦</span> MOVIERANKER
              </div>
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b8b94;margin-top:4px;">
                Identity Verification · Reauthentication
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;text-align:center;">
              <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">Security Verification Code</h1>
              <p style="font-size:14px;line-height:22px;color:#8b8b94;margin:0 0 20px 0;">
                To protect your account before performing a sensitive action, enter this 6-digit verification code:
              </p>
              <div style="display:inline-block;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:8px;color:#f5c518;background-color:#0d0d10;padding:12px 28px;border-radius:8px;border:1px dashed rgba(245,197,24,0.4);margin-bottom:20px;">
                {{ .Token }}
              </div>
              <p style="font-size:11px;color:#6b6b75;margin:16px 0 0 0;line-height:18px;">
                This code expires in 10 minutes. If you did not initiate this request, someone may be attempting to access your account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#121216;border-top:1px solid #22222a;padding:20px 32px;text-align:center;font-size:11px;color:#6b6b75;line-height:18px;">
              movieranker.win · Curate, debate, and rank the films you love.<br>
              Urgent support: <a href="mailto:admin@movieranker.win" style="color:#f5c518;text-decoration:none;">admin@movieranker.win</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
