import { buildMapUrl } from "@/lib/fuel-stations";
import { env } from "@/lib/env";
import type { FuelRequestRecord } from "@/lib/requests/service";

export type HelpLineEmailResult = {
  status: "sent" | "skipped" | "failed";
  destination?: string;
  message: string;
};

function hasEmailConfiguration() {
  return Boolean(env.HELP_LINE_EMAIL_TO && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function formatRequestSummary(request: FuelRequestRecord) {
  return [
    `Request ID: ${request.id}`,
    `Customer name: ${request.customerName ?? "Not provided"}`,
    `Contact phone: ${request.contactPhone}`,
    `Fuel type: ${request.fuelType}`,
    `Quantity: ${request.quantityLitres} litres`,
    `Priority: ${request.priority}`,
    `Location: ${request.latitude.toFixed(6)}, ${request.longitude.toFixed(6)}`,
    `Map: ${buildMapUrl(request.latitude, request.longitude)}`,
    `Request channel: ${request.requestChannel}`,
    `Estimated total: ₹${request.estimatedTotal.toFixed(2)}`,
    `Created at: ${request.createdAt}`
  ].join("\n");
}

function formatRequestHtml(request: FuelRequestRecord) {
  const rows = [
    ["Request ID", request.id],
    ["Customer name", request.customerName ?? "Not provided"],
    ["Contact phone", request.contactPhone],
    ["Fuel type", request.fuelType],
    ["Quantity", `${request.quantityLitres} litres`],
    ["Priority", request.priority],
    ["Location", `${request.latitude.toFixed(6)}, ${request.longitude.toFixed(6)}`],
    ["Map", buildMapUrl(request.latitude, request.longitude)],
    ["Request channel", request.requestChannel],
    ["Estimated total", `₹${request.estimatedTotal.toFixed(2)}`],
    ["Created at", request.createdAt]
  ];

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#17212b;line-height:1.6">
      <h2 style="margin:0 0 12px">Fuel10 emergency request</h2>
      <p style="margin:0 0 16px">A victim request was submitted and should be reviewed immediately.</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td style="border:1px solid #e5e7eb;font-weight:700;vertical-align:top;background:#f8fafc;width:180px">${label}</td>
                <td style="border:1px solid #e5e7eb;vertical-align:top">${String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</td>
              </tr>
            `
          )
          .join("")}
      </table>
    </div>
  `;
}

export async function sendHelpLineEmail(request: FuelRequestRecord): Promise<HelpLineEmailResult> {
  if (!hasEmailConfiguration()) {
    return {
      status: "skipped",
      message: "Help-line email is not configured. Set HELP_LINE_EMAIL_TO and SMTP_* env vars to enable delivery."
    };
  }

  try {
    const { default: nodemailer } = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: env.HELP_LINE_EMAIL_FROM ?? env.SMTP_USER,
      to: env.HELP_LINE_EMAIL_TO,
      subject: `[Fuel10] Emergency request ${request.id}`,
      text: formatRequestSummary(request),
      html: formatRequestHtml(request)
    });

    return {
      status: "sent",
      destination: env.HELP_LINE_EMAIL_TO,
      message: `Sent to ${env.HELP_LINE_EMAIL_TO}`
    };
  } catch (error) {
    return {
      status: "failed",
      destination: env.HELP_LINE_EMAIL_TO ?? undefined,
      message: error instanceof Error ? error.message : "Unable to send help-line email"
    };
  }
}
