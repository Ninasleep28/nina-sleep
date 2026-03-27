// ──────────────────────────────────────────────────────────────────────────────────
// 🌙 NINA BABY SLEEP BOT
// Deployed on Vercel | Supabase + Stripe + Twilio + Claude Haiku
// ──────────────────────────────────────────────────────────────────────────────────
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";
import Stripe from "stripe";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import nodemailer from "nodemailer";
import { Resend } from "resend";

dayjs.extend(utc);
dayjs.extend(timezone);
import { waitUntil } from "@vercel/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const MAX_HISTORY_TURNS = 20;

const SYSTEM_PROMPT = `את נינה - יועצת שינה AI מקצועית לתינוקות ופעוטות.
את מדברת עברית בלבד, בטון חם, אמפתי, ולא שיפוטי.
את האוזן הקשבת של ההורים בשעות הכי קשות - 3 לפנות בוקר כשהכל מרגיש בלתי אפשרי.
את מקצועית, ישירה, וחכמה - אבל תמיד רואה קודם כל את ההורה ואת הילד, לא את השיטה.

עקרונות ליבה:
1. אדפטיביות - אין שיטה אחת שמתאימה לכולם. את תמיד מתאימה את הגישה למשפחה הספציפית.
2. זיכרון - את זוכרת כל פרט מכל שיחה. גיל התינוק, שם, מה ניסו, מה עבד, מה לא.
3. ליווי בזמן אמת - את שם בדיוק ברגע שצריכים אותך.
4. גמישות - אם תוכנית לא עובדת, את מזהה את זה ומשנה כיוון מיד.
5. לא מחליפה רופא - תמיד ציני שאת לא מחליפה ייעוץ רפואי.

שיטות השינה שאת מכירה:
1. CIO - Cry It Out: מגיל 6 חודשים. השכבה בטקס קבוע, יציאה, לא חוזרים עד הבוקר. יעיל ומהיר אבל קשה רגשית.
2. Ferber / Graduated Extinction: מגיל 5-6 חודשים. בדיקות לפי מרווחי זמן גדלים (5/10/15 דקות). פחות קשה מ-CIO.
3. Chair Method / Sleep Lady Shuffle: מגיל 6 חודשים. ההורה יושב ליד המיטה ומתקדם לאט לאט לדלת. עדין, לוקח 2-3 שבועות.
4. Fading / Camping Out: מגיל 4 חודשים. הפחתה הדרגתית של ההתערבות. לתינוקות רגישים.
5. Pick Up Put Down: מגיל 4-8 חודשים. מרימים כשבוכה, משכיבים כשנרגע.
6. No Cry Sleep Solution: כל גיל. שינויים קטנים והדרגתיים. ללא בכי כלל אבל לוקח חודשים.
7. Attachment-Based: כל גיל. מענה מיידי לכל צורך. להורים שמאמינים בהורות היקשרותית.
8. גישת שגרה וסביבה: מכל גיל. שגרת לילה קבועה + סביבה אופטימלית. הבסיס לכל גישה.

תינוקות מתחת לגיל 4 חודשים:
כשהתינוק מתחת לגיל 4 חודשים, את עובדת רק על שגרה, סביבה וציפיות ריאליות.
לא ממליצה על CIO, Ferber, שיטת הכיסא, או כל גישה שדורשת בכי.
תסבירי להורים בחום מה כן אפשר לעשות בגיל הזה — הרבה יש מה לעשות, רק אחרת.

פרוטוקול היכרות - מיד אחרי תשלום:
שלחי הודעת וולקאם חמה, ואז שאלי בלוק אחד של שאלות בכל פעם — המתיני לתשובה לפני שממשיכים לבלוק הבא. השאלות תמיד ספציפיות וכמותיות.

בלוק 1 — הרדמה:
מה שם התינוק/תינוקת וגילו/ה בחודשים?
---
איך נרדם/ת כרגע בדיוק? (הנקה, בקבוק, נדנוד בעמידה, הליכה, ליד הורה במיטה, לבד?) וכמה דקות זה לוקח בערך?

בלוק 2 — שינת לילה:
באיזו שעה נרדם/ת בערב ובאיזו שעה קם/ה בבוקר?
---
כמה פעמים קם/ה בלילה ובאיזו שעות?
---
איך מחזירים אותו/ה לישון בכל יקיצה? (הנקה, בקבוק, נדנוד, ליד ההורה?) וכמה דקות זה לוקח?
---
האם מקבל/ת הנקה או בקבוק בלילה? כמה פעמים?

בלוק 3 — שינות יום:
כמה שינות יום יש ובאיזו שעות? (שינת בוקר, שינת צהריים) וכמה זמן כל שינה בערך?

בלוק 4 — תזונה:
האם יונק/ת או שותה בקבוק? כמה פעמים ביום?
---
מה הארוחה האחרונה לפני שינה ובאיזו שעה?

בלוק 5 — סביבה:
איפה ישן/ה — מיטה שלו/ה, חדר הורים, מיטת הורים? חדר לבד או עם אח/אחות?
---
תוך כמה דקות בדרך כלל התינוק/ת נרגע/ת כשבוכה?

בלוק 6 — רקע:
האם יש מסגרת חינוכית? (גן/פעוטון) באילו שעות?
---
חשיפה למסכים — כן/לא? אם כן, מתי אחרונה לפני שינה?
---
האם נוחר/ת או מזיע/ה הרבה בשינה?
---
האם פניתם לרופא ונשללה בעיה רפואית?
---
האם התייעצתם עם יועצת שינה בעבר? מה ניסיתם ומה עבד?

בלוק 7 — הורים:
מי מטפל בלילה — אמא, אבא, שניהם?
---
האם שני ההורים מסכימים על הגישה?
---
יכולים לשמוע בכי כדי להגיע לתוצאה, או שזה קו אדום?
---
מה הלילה האידיאלי בעוד חודש?

אחרי כל התשובות:
1. סכמי בחום את מה שהבנת
2. המלצי על גישה מתאימה עם הסבר ברור למה היא מתאימה למשפחה הזו
3. שלחי תוכנית מפורטת ל-7 ימים — כולל שעות, טקס הרדמה צעד אחר צעד, ומה לעשות ביקיצות לילה
4. בסוף התוכנית הוסיפי: "חשוב לדעת — ההצלחה תלויה בשיתוף הפעולה שלכם. עדכנו אותי בכל התעוררות, ארוחה ושינה — הודעה קצרה בוואטספ מספיקה. אחרי 3 לילות נעשה יחד הערכת מצב ונחליט האם להמשיך, לחזור צעד אחורה, או להתקדם."
5. הוסיפי: "התוכנית הזו שלכם — אפשר לעדכן, לשנות ולהתאים אותה בכל עת. פשוט תגידו לי 💜 לפני שמתחילים — הכל ברור? משהו מדאיג? רוצים להתחיל בקצב איטי יותר?"
6. שאלי: באיזו שעה מתחיל טקס ההרדמה הערב?

שמירת לו"ז:
אחרי שסיימת את השאלון ושלחת תוכנית — השתמשי בכלי save_schedule כדי לשמור את לו"ז השינה.
חלצי מהשיחה: שעת יקיצה בבוקר (wake_time), שנות יום — שעת תחילה ומשך בדקות (morning_nap_start, morning_nap_duration, afternoon_nap_start, afternoon_nap_duration), שעת טקס הרדמה (bedtime), ושעות יקיצות לילה (wakeup_times).
כל השעות בפורמט HH:MM (למשל "07:00", "19:30").
אם ההורה מעדכן בהמשך שמשהו השתנה (למשל "הורדנו שנת בוקר" או "עכשיו הוא קם ב-6") — השתמשי שוב ב-save_schedule עם כל הנתונים המעודכנים.

פרוטוקול ערבי:
- רבע שעה לפני הטקס: שלחי תזכורת
- בזמן הטקס: לווי צעד אחר צעד
- שאלי כל 10-15 דקות מה קורה עד שנרדם

פרוטוקול יקיצות לילה:
- כשההורה שולח שהתינוק קם: שאלי מה השעה וכמה זמן ישן
- תני הנחיות מיידיות
- שאלי כל רבע שעה האם נרדם
- כשנרדם: כל הכבוד, לכו לישון גם אתם

פרוטוקול בוקר:
- אם יש תיעוד מהלילה (ההורה דיווח על יקיצות/הרדמה): "☀️ בוקר טוב! איך אתם מרגישים?" + סיכום קצר של הלילה + "ממשיכים הערב או מתאימים משהו?"
- אם אין תיעוד מהלילה: "☀️ בוקר טוב! איך היה הלילה? לא קיבלתי עדכונים אמש — ספרו לי בקצרה."
- אם לא עונים - אל תציקי במהלך היום
- לפני ההרדמה הבאה: אגב, לא קיבלתי עדכון על הלילה אמש - הכל בסדר?

שינוי גישה:
- אם אחרי 3-4 ימים אין התקדמות - שאלי שאלות מעמיקות
- הצעי להחליף גישה ותסבירי למה
- תמיד שאלי: איך אתם מרגישים עם זה?

שאלות על מחיר:
אם הורה שואל על מחיר, עלות, תשלום, כמה עולה — ענה: "הליווי המלא עולה 249 ₪ לחודש. להתחיל: ninababysleep.com/payment.html"

מה נינה לא עושה:
- לא עונה על שאלות שאינן קשורות לשינת תינוקות
- אם שואלים משהו לא רלוונטי כמו תוצאות ספורט, מזג אוויר, חדשות וכו - תחזירי את השיחה: אני מתמחה בשינת תינוקות בלבד. יש משהו שקשור לשינה שאני יכולה לעזור בו?
- לא נותנת ייעוץ רפואי - תמיד מפנה לרופא
- לא שיפוטית - לעולם

טון ושפה:
- חמה וקרובה כמו חברה מקצועית
- משפטים קצרים - הורים עייפים לא קוראים טקסטים ארוכים
- אמוג'ים מינימלי - רק כשעוזר
- שפה מכילה מגדרית: תמיד "התינוק/תינוקת" או "הילד/ה", לעולם לא "הקטן" או "שמו של הקטן"
- שאלות ספציפיות וכמותיות: במקום "לוקח הרבה זמן?" שאלי "כמה דקות בערך לוקח עד שנרדם/ת?". במקום "קם הרבה בלילה?" שאלי "כמה פעמים קם/ה הלילה?". תמיד בקשי מספרים — דקות, פעמים, שעות
- תמיד מאשרת ומבינה לפני שנותנת עצה

הודעות יזומות:
נינה לא שולחת הודעות וואטספ יזומות (תזכורות, הודעות בוקר, תזמונים) עד שהיוזר אישר במפורש שרוצה להתחיל את הליווי ושילם. עד אז נינה עונה רק על הודעות נכנסות.

מצב בדיקה:
אם ההורה אומר במפורש "אני רוצה לבדוק את המערכת" או "זה בדיקה" — קבלי כל שעה שהוא נותן ושמרי אותה ב-save_schedule ללא שאלות ובלי התנגדות. דלגי על השאלון ושמרי ישר.`;

const SCHEDULE_TOOLS = [{
  name: "save_schedule",
  description: "Save or update the baby's sleep schedule to enable automated notifications. Call this after sending the 7-day plan, or when the parent reports a schedule change.",
  input_schema: {
    type: "object",
    properties: {
      wake_time: { type: "string", description: "Morning wake time in HH:MM format, e.g. '07:00'" },
      morning_nap_start: { type: "string", description: "Morning nap start time in HH:MM, e.g. '09:30'" },
      morning_nap_duration: { type: "number", description: "Morning nap duration in minutes, e.g. 45" },
      afternoon_nap_start: { type: "string", description: "Afternoon nap start time in HH:MM, e.g. '13:00'" },
      afternoon_nap_duration: { type: "number", description: "Afternoon nap duration in minutes, e.g. 60" },
      bedtime: { type: "string", description: "Bedtime routine start time in HH:MM, e.g. '19:00'" },
      wakeup_times: { type: "array", items: { type: "string" }, description: "Typical night wakeup times in HH:MM, e.g. ['01:00', '04:00']" }
    },
    required: ["wake_time", "bedtime"]
  }
}];

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

async function saveSchedule(phone, data) {
  const { error } = await supabase.from("schedules").upsert({
    phone_number: phone,
    wake_time: data.wake_time,
    morning_nap_start: data.morning_nap_start || null,
    morning_nap_duration: data.morning_nap_duration || null,
    afternoon_nap_start: data.afternoon_nap_start || null,
    afternoon_nap_duration: data.afternoon_nap_duration || null,
    bedtime: data.bedtime,
    wakeup_times: data.wakeup_times || [],
    updated_at: new Date().toISOString()
  }, { onConflict: "phone_number" });
  if (error) throw error;
}

async function loadHistory(phone) {
  const { data, error } = await supabase.from("conversations").select("messages").eq("phone_number", phone).single();
  if (error && error.code !== "PGRST116") throw error;
  return data?.messages ?? [];
}

async function saveHistory(phone, messages) {
  const maxMessages = MAX_HISTORY_TURNS * 2;
  const trimmed = messages.length > maxMessages ? messages.slice(messages.length - maxMessages) : messages;
  const { error } = await supabase.from("conversations").upsert({ phone_number: phone, messages: trimmed }, { onConflict: "phone_number" });
  if (error) throw error;
}

async function saveUser(userId, email, isPremium = false, whatsappNumber = null) {
  const { error } = await supabase.from("users").upsert(
    { id: userId, email, is_premium: isPremium, ...(whatsappNumber && { whatsapp_number: whatsappNumber }) },
    { onConflict: "id" }
  );
  if (error) { console.error("Error saving user:", error); throw error; }
}

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.sendgrid.net",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "apikey",
    pass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || "",
  },
});

async function sendEmail(to, subject, text) {
  if (!to) throw new Error("Missing recipient email");
  await emailTransporter.sendMail({
    from: process.env.EMAIL_FROM || "nina@ninababysleep.com",
    to,
    subject,
    text,
  });
}

async function sendWhatsApp(to, body) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("Twilio credentials missing; skipping WhatsApp send");
    return;
  }

  await twilioClient.messages.create({ from: TWILIO_WHATSAPP_NUMBER, to, body });
}

async function askClaude(phone, userMessage) {
  const history = await loadHistory(phone);
  history.push({ role: "user", content: userMessage });

  let allText = "";
  let response = await anthropic.messages.create({
    model: "claude-opus-4-6", max_tokens: 1024, system: SYSTEM_PROMPT, messages: history, tools: SCHEDULE_TOOLS,
  });

  while (response.stop_reason === "tool_use") {
    allText += response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    history.push({ role: "assistant", content: response.content });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    let toolResult = "Unknown tool";

    if (toolUse.name === "save_schedule") {
      try {
        await saveSchedule(phone, toolUse.input);
        toolResult = "Schedule saved successfully";
      } catch (err) {
        toolResult = `Error saving schedule: ${err.message}`;
      }
    }

    history.push({ role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: toolResult }] });

    response = await anthropic.messages.create({
      model: "claude-opus-4-6", max_tokens: 1024, system: SYSTEM_PROMPT, messages: history, tools: SCHEDULE_TOOLS,
    });
  }

  allText += response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  history.push({ role: "assistant", content: response.content });
  await saveHistory(phone, history);
  return allText;
}

const app = express();

app.post("/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, whatsappNumber, email } = session.metadata;
    console.log(`Payment success! userId: ${userId}, whatsapp: ${whatsappNumber}`);
    waitUntil((async () => {
      try {
        await saveUser(userId, email, true, whatsappNumber);
        await sendWhatsApp(whatsappNumber, `היי! 🌙 אני נינה, יועצת השינה שלך.\n\nאני כאן 24/7 - כולל 3 לפנות בוקר כשהכל מרגיש בלתי אפשרי.\n\nלפני שנתחיל, אני רוצה להכיר אתכם קצת יותר לעומק.\nיש לי כמה שאלות - קחו את הזמן לענות, אין מהר 💜\n\nנתחיל: מה שם התינוק ומה גילו בחודשים?`);
      } catch (err) { console.error("Error processing payment webhook:", err); }
    })());
  }
    else if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const customerEmail = invoice.customer_email;
    console.log(`Invoice payment failed for ${customerEmail}`);
    try {
      if (customerEmail) {
        const { data: user, error: userError } = await supabase.from("users").select("id").eq("email", customerEmail).single();
        if (!userError && user?.id) {
          await supabase.from("subscriptions").upsert({ user_id: user.id, status: "past_due" }, { onConflict: "user_id" });
        }
        await sendEmail(
          customerEmail,
          "????? ????? ????? - ????",
          `????,\n\n???? ??????? ????? ?? ?????? ????? ??? ???????.\n??? ????/? ?? ???? ?????? ????/??? ???.\n\n??? ????: hello@ninababysleep.com\n\n?????, ???? ????`
        );
      }
    } catch (err) {
      console.error("Failed handling invoice.payment_failed:", err);
    }
  }
  else if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    const customerEmail = invoice.customer_email;
    console.log(`Invoice payment succeeded for ${customerEmail}`);
    try {
      if (customerEmail) {
        const { data: user, error: userError } = await supabase.from("users").select("id").eq("email", customerEmail).single();
        if (!userError && user?.id) {
          await supabase.from("subscriptions").upsert({ user_id: user.id, status: "active" }, { onConflict: "user_id" });
        }
      }
    } catch (err) {
      console.error("Failed handling invoice.payment_succeeded:", err);
    }
  }res.json({ received: true });
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => res.sendFile(join(__dirname, 'index.html')));
app.get("/auth.html", (req, res) => res.sendFile(join(__dirname, 'auth.html')));
app.get("/quiz.html", (req, res) => res.sendFile(join(__dirname, 'quiz.html')));
app.get("/dashboard.html", (req, res) => res.sendFile(join(__dirname, 'dashboard.html')));
app.get("/dashboard", (req, res) => res.sendFile(join(__dirname, 'dashboard.html')));
app.get("/payment.html", (req, res) => res.sendFile(join(__dirname, 'payment.html')));
app.get("/success.html", (req, res) => res.sendFile(join(__dirname, 'success.html')));

app.get("/config", (req, res) => {
  res.json({ stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

app.post("/save-user", async (req, res) => {
  const { userId, email, fullname, whatsappNumber } = req.body;
  if (!email) return res.status(400).json({ message: "Missing email" });
  try {
    const id = userId || crypto.randomUUID();
    const { error } = await supabase.from("users").upsert({
      id, email, is_premium: false,
      ...(fullname && { full_name: fullname }),
      ...(whatsappNumber && { whatsapp_number: whatsappNumber }),
    }, { onConflict: "id" });
    if (error) throw error;
    res.json({ ok: true, userId: id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/send-verification", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Missing email" });
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete old codes for this email
    await supabase.from("verification_codes").delete().eq("email", email);

    // Save new code
    const { error } = await supabase.from("verification_codes").insert({ email, code, expires_at: expiresAt });
    if (error) throw error;

    // Send email via Resend
    await resend.emails.send({
      from: "נינה <hello@ninababysleep.com>",
      to: email,
      subject: "קוד אימות - נינה יועצת שינה",
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;text-align:center;padding:40px 20px;">
        <h2 style="color:#764ba2;">🌙 נינה</h2>
        <p style="font-size:16px;color:#333;">קוד האימות שלך:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#764ba2;margin:20px 0;">${code}</div>
        <p style="font-size:13px;color:#888;">הקוד תקף ל-10 דקות</p>
      </div>`
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error sending verification:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: "Missing email or code" });
  try {
    const { data, error } = await supabase
      .from("verification_codes")
      .select("code, expires_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return res.status(400).json({ ok: false, message: "לא נמצא קוד — נסו לשלוח שוב" });
    if (new Date(data.expires_at) < new Date()) return res.status(400).json({ ok: false, message: "הקוד פג תוקף — נסו לשלוח שוב" });
    if (data.code !== code) return res.status(400).json({ ok: false, message: "קוד שגוי" });

    // Clean up used code
    await supabase.from("verification_codes").delete().eq("email", email);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/sleep-session", async (req, res) => {
  const { userId, date, duration_minutes, notes } = req.body;
  if (!userId || !date || !duration_minutes) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }
  try {
    const { error } = await supabase.from("sleep_sessions").insert({
      user_id: userId,
      date,
      duration_minutes,
      notes: notes || ""
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post("/stripe-checkout", async (req, res) => {
  const { email, userId, whatsappNumber } = req.body;
  if (!email || !userId) return res.status(400).json({ message: "Missing email or userId" });
  if (!whatsappNumber) return res.status(400).json({ message: "Missing WhatsApp number" });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `https://ninababysleep.com/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://ninababysleep.com/payment.html`,
      metadata: { userId, whatsappNumber, email },
    });
    res.json({ checkoutUrl: session.url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const FREE_MESSAGE_LIMIT = 5;
const PAYMENT_LINK_MSG = "כדי להתחיל את תוכנית הליווי הצמוד — 249 ₪ לחודש: https://ninababysleep.com/payment.html";

app.post("/start-free", async (req, res) => {
  const { whatsappNumber } = req.body;
  if (!whatsappNumber) return res.status(400).json({ message: "Missing whatsappNumber" });
  try {
    await sendWhatsApp(whatsappNumber, `היי! 🌙 אני נינה, יועצת השינה שלך.\n\nאני כאן 24/7 - כולל 3 לפנות בוקר כשהכל מרגיש בלתי אפשרי.\n\nלפני שנתחיל, אני רוצה להכיר אתכם קצת יותר לעומק.\nיש לי כמה שאלות - קחו את הזמן לענות, אין מהר 💜\n\nנתחיל: מה שם התינוק/תינוקת וגילו/ה בחודשים?`);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error in /start-free:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body?.trim();
  const from = req.body.From;
  if (!incomingMsg || !from) return res.status(400).send("Missing Body or From");
  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");
  waitUntil((async () => {
    try {
      // Check if user is premium
      const { data: user } = await supabase.from("users").select("is_premium, free_messages_count, plan_started").eq("whatsapp_number", from).single();
      const isPremium = user?.is_premium === true;
      const planStarted = user?.plan_started === true;
      const freeCount = user?.free_messages_count || 0;

      // If not premium and plan was sent, count messages
      if (!isPremium && planStarted && freeCount >= FREE_MESSAGE_LIMIT) {
        await sendWhatsApp(from, PAYMENT_LINK_MSG);
        return;
      }

      const reply = await askClaude(from, incomingMsg);
      await sendWhatsApp(from, reply);

      // Check if plan was just sent (save_schedule was called = plan_started)
      // Increment free message count for non-premium users after plan started
      if (!isPremium && planStarted) {
        await supabase.from("users").update({ free_messages_count: freeCount + 1 }).eq("whatsapp_number", from);
      }

      // Detect if plan was just sent by checking if schedule exists now
      if (!isPremium && !planStarted) {
        const { data: schedule } = await supabase.from("schedules").select("phone_number").eq("phone_number", from).single();
        if (schedule) {
          await supabase.from("users").update({ plan_started: true }).eq("whatsapp_number", from);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      try { await sendWhatsApp(from, "מצטערת, נתקלתי בבעיה טכנית. נסי שוב בעוד כמה דקות 🌙"); }
      catch (e) {}
    }
  })());
});

app.post("/reset/:phone", async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const { error } = await supabase.from("conversations").delete().eq("phone_number", phone);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

app.get("/api/dashboard", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ ok: false, message: "Missing user_id" });

  try {
    const { data: userData, error: userError } = await supabase.from("users").select("id,email,is_premium").eq("id", userId).single();
    if (userError) return res.status(500).json({ ok: false, error: userError.message });

    const { data: sessions, error: sessionsError } = await supabase.from("sleep_sessions").select("date,duration_minutes,notes").eq("user_id", userId).order("date", { ascending: false }).limit(12);
    if (sessionsError) return res.status(500).json({ ok: false, error: sessionsError.message });

    return res.json({ ok: true, user: userData, sessions });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/status", async (_req, res) => {
  const { data, error } = await supabase.from("conversations").select("phone_number, messages, updated_at").order("updated_at", { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ activeConversations: data.length, conversations: data.map(r => ({ phone: r.phone_number, turns: r.messages.length / 2, lastActivity: r.updated_at })) });
});

// Normalize time to HH:mm — handles "23:25:00", "4:00", "04:00", etc.
function normalizeTime(t) {
  if (!t) return null;
  const parts = t.trim().split(":");
  if (parts.length < 2) return null;
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

app.post("/cron/send-notifications", async (req, res) => {
  try {
    const { data: schedules, error } = await supabase.from("schedules").select("*");
    if (error) throw error;
    if (!schedules || schedules.length === 0) {
      console.log("[CRON] No schedules found");
      return res.json({ ok: true, sent: 0 });
    }

    let sent = 0;

    for (const s of schedules) {
      const phone = s.phone_number;
      if (!phone) continue;

      const tz = s.timezone || "Asia/Jerusalem";
      const now = dayjs().tz(tz);
      const currentTime = now.format("HH:mm");

      const wakeTime = normalizeTime(s.wake_time);
      const bedtime = normalizeTime(s.bedtime);
      const morningNapStart = normalizeTime(s.morning_nap_start);
      const afternoonNapStart = normalizeTime(s.afternoon_nap_start);
      const wakeupTimes = Array.isArray(s.wakeup_times) ? s.wakeup_times.map(normalizeTime).filter(Boolean) : [];

      console.log(`[CRON] phone=${phone} tz=${tz} now=${currentTime} wake=${wakeTime} bed=${bedtime} naps=${morningNapStart},${afternoonNapStart} wakeups=${JSON.stringify(wakeupTimes)}`);

      // Morning message + increment nights_count
      if (wakeTime === currentTime) {
        console.log(`[CRON] MATCH wake_time for ${phone}`);
        await sendWhatsApp(phone, "בוקר טוב! ☀️ איך היה הלילה? ספרו לי הכל — כמה יקיצות, כמה זמן לקח להירדם מחדש, ואיך אתם מרגישים.");
        await supabase.from("schedules").update({ nights_count: (s.nights_count || 0) + 1 }).eq("phone_number", phone);
        sent++;
      }

      // Morning nap start
      if (morningNapStart === currentTime) {
        console.log(`[CRON] MATCH morning_nap_start for ${phone}`);
        await sendWhatsApp(phone, "הגיע זמן שינת בוקר 😴 שמתם לישון? ספרו לי איך ההרדמה.");
        sent++;
      }

      // Morning nap end
      if (morningNapStart && s.morning_nap_duration) {
        const napEnd = addMinutesToTime(morningNapStart, s.morning_nap_duration);
        if (napEnd === currentTime) {
          console.log(`[CRON] MATCH morning_nap_end for ${phone}`);
          await sendWhatsApp(phone, "קם/ה משינת הבוקר? כמה זמן ישן/ה בסוף?");
          sent++;
        }
      }

      // Afternoon nap start
      if (afternoonNapStart === currentTime) {
        console.log(`[CRON] MATCH afternoon_nap_start for ${phone}`);
        await sendWhatsApp(phone, "הגיע זמן שינת צהריים 😴 שמתם לישון? ספרו לי איך ההרדמה.");
        sent++;
      }

      // Afternoon nap end
      if (afternoonNapStart && s.afternoon_nap_duration) {
        const napEnd = addMinutesToTime(afternoonNapStart, s.afternoon_nap_duration);
        if (napEnd === currentTime) {
          console.log(`[CRON] MATCH afternoon_nap_end for ${phone}`);
          await sendWhatsApp(phone, "קם/ה משינת הצהריים? כמה זמן ישן/ה בסוף?");
          sent++;
        }
      }

      // Bedtime reminder (15 min before)
      if (bedtime) {
        const reminder = addMinutesToTime(bedtime, -15);
        if (reminder === currentTime) {
          console.log(`[CRON] MATCH bedtime_reminder for ${phone}`);
          await sendWhatsApp(phone, "עוד 15 דקות מתחיל טקס ההרדמה 🌙 מוכנים?");
          sent++;
        }
      }

      // Bedtime start
      if (bedtime === currentTime) {
        console.log(`[CRON] MATCH bedtime for ${phone}`);
        await sendWhatsApp(phone, "מתחילים טקס הרדמה! 🌙 עדכנו אותי צעד אחר צעד.");
        sent++;
      }

      // Night wakeup check
      if (wakeupTimes.includes(currentTime)) {
        console.log(`[CRON] MATCH wakeup_time ${currentTime} for ${phone}`);
        await sendWhatsApp(phone, "הכל בסדר? אם קם/ה — ספרו לי ואדריך אתכם.");
        sent++;
      }

      // 3-night assessment (sent at morning time)
      if ((s.nights_count || 0) >= 3 && !s.last_assessment && wakeTime === currentTime) {
        console.log(`[CRON] MATCH 3-night assessment for ${phone}`);
        await sendWhatsApp(phone, "עברו 3 לילות! 🎯 הגיע זמן להערכת מצב. איך אתם מרגישים? מה השתפר ומה עדיין קשה?");
        await supabase.from("schedules").update({ last_assessment: new Date().toISOString() }).eq("phone_number", phone);
        sent++;
      }
    }

    console.log(`[CRON] Done. Sent ${sent} notifications.`);
    res.json({ ok: true, sent });
  } catch (err) {
    console.error("[CRON] Error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`\n🌙 נינה פועלת על פורט ${PORT}\n`));
}

export default app;

