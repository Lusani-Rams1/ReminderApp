
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendVerificationEmail(email, fullName, token) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || "CampusSync";

    if (!apiKey || !senderEmail) {
        throw new Error("Brevo email configuration is missing.");
    }

    const verificationUrl = new URL(
        "https://lusani-rams1.github.io/ReminderApp/verify-email.html"
    );

    verificationUrl.searchParams.set("token", token);

    const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
            "accept": "application/json",
            "api-key": apiKey,
            "content-type": "application/json"
        },
        body: JSON.stringify({
            sender: {
                name: senderName,
                email: senderEmail
            },
            to: [
                {
                    email,
                    name: fullName
                }
            ],
            subject: "Verify your CampusSync email address",
            htmlContent: `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
                    <h2>Welcome to CampusSync!</h2>
                    <p>Thank you for registering.</p>
                    <p>Click the button below to verify your email address.</p>
                    <p>
                        <a href="${verificationUrl.toString()}"
                           style="background:#173b85;color:white;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block">
                            Verify Email
                        </a>
                    </p>
                    <p>This verification link expires in 30 minutes.</p>
                    <p>If you did not create a CampusSync account, ignore this email.</p>
                </div>
            `,
            textContent:
                `Welcome to CampusSync!\n\n` +
                `Verify your email address using this link:\n` +
                `${verificationUrl.toString()}\n\n` +
                `This link expires in 30 minutes.`
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Brevo email request failed:", response.status);
        throw new Error(
            `Email delivery failed (HTTP ${response.status}).`
        );
    }

    return response.json();
}


async function sendPasswordResetEmail(email, fullName, token) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || "CampusSync";

    if (!apiKey || !senderEmail) {
        throw new Error("Brevo email configuration is missing.");
    }

    const resetUrl = new URL(
        "https://lusani-rams1.github.io/ReminderApp/reset-password.html"
    );

    resetUrl.searchParams.set("token", token);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "accept": "application/json",
            "api-key": apiKey,
            "content-type": "application/json"
        },
        body: JSON.stringify({
            sender: {
                name: senderName,
                email: senderEmail
            },
            to: [{ email, name: fullName }],
            subject: "Reset your CampusSync password",
            htmlContent: `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
                    <h2>CampusSync Password Reset</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your password.</p>
                    <p>
                        <a href="${resetUrl.toString()}"
                           style="background:#173b85;color:white;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block">
                            Reset Password
                        </a>
                    </p>
                    <p>This link expires in 30 minutes.</p>
                    <p>If you did not request this, you can ignore this email.</p>
                </div>
            `,
            textContent:
                "CampusSync Password Reset\n\n" +
                "Use this link to reset your password:\n" +
                resetUrl.toString() + "\n\n" +
                "This link expires in 30 minutes."
        })
    });

    if (!response.ok) {
        console.error("Brevo password reset request failed:", response.status);
        throw new Error("Unable to send password reset email.");
    }

    return response.json();
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};