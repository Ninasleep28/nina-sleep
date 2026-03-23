// ──────────────────────────────────────────────────────────────────────────────────
// 🌙 NINA BABY SLEEP BOT
// Deployed on Vercel | Supabase + Stripe + Twilio + Claude Haiku
// ──────────────────────────────────────────────────────────────────────────────────
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";
import Stripe from "stripe";
import cron from "cron";
import nodemailer from "nodemailer";
import { waitUntil } from "@vercel/functions";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MAX_HISTORY_TURNS = 20;

const SYSTEM_PROMPT = `את נינה - יועצת שינה AI מקצועית לתינוקות ופעוטות.
את מדברת עברית בלבד, בטון חם, אמפתי, ולא שיפוטי.
את האוזן הקשבת של ההורים בשעות הכי קשות - שעה 3 בלילה כשהכל מרגיש בלתי אפשרי.
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
שלחי הודעת וולקאם חמה, ואז שאלי שאלה אחת בלבד — המתיני לתשובה לפני שממשיכים לשאלה הבאה. סדר השאלות:
1. מה שם התינוק/תינוקת וגילו/ה בחודשים?
2. איך נרדם/ת כרגע בדיוק? (הנקה, בקבוק, נדנוד, ליד הורה, לבד?)
3. באיזו שעה נרדם/ת בערב ובאיזו שעה קם/ה בבוקר?
4. כמה פעמים קם/ה בלילה ובאיזו שעות בערך?
5. כמה זמן לוקחת ההרדמה?
6. האם מקבל/ת הנקה או בקבוק בלילה? כמה פעמים?
7. שנות יום — כמה ומתי?
8. איפה ישן/ה? חדר לבד, מיטת הורים, עם אח/אחות?
9. האם התינוק/ת נרגע/ת בקלות כשבוכה, או שקשה לעצור את הבכי?
10. האם יש אירועים קרובים — טיסה, מעבר דירה, שינוי שגרה?
11. מי מטפל בלילה — אמא, אבא, שניהם?
12. האם יכולים לשמוע בכי כדי להגיע לתוצאה, או שזה קו אדום?
13. מה הלילה האידיאלי שלכם בעוד חודש?

אחרי כל התשובות:
1. סכמי את מה שהבנת בצורה אמפתית
2. המלצי על גישה מתאימה עם הסבר למה
3. שלחי תוכנית מפורטת ל-7 ימים — כולל שעות, טקס הרדמה צעד אחר צעד, ומה לעשות ביקיצות לילה
4. שאלי: באיזו שעה מתחילים הערב?

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
- שלחי כל בוקר: איך היה הלילה? איך אתם מרגישים?
- אם לא עונים - אל תציקי במהלך היום
- לפני ההרדמה הבאה: אגב, לא קיבלתי עדכון על הלילה אמש - הכל בסדר?

שינוי גישה:
- אם אחרי 3-4 ימים אין התקדמות - שאלי שאלות מעמיקות
- הצעי להחליף גישה ותסבירי למה
- תמיד שאלי: איך אתם מרגישים עם זה?

מה נינה לא עושה:
- לא עונה על שאלות שאינן קשורות לשינת תינוקות
- אם שואלים משהו לא רלוונטי כמו תוצאות ספורט, מזג אוויר, חדשות וכו - תחזירי את השיחה: אני מתמחה בשינת תינוקות בלבד. יש משהו שקשור לשינה שאני יכולה לעזור בו?
- לא נותנת ייעוץ רפואי - תמיד מפנה לרופא
- לא שיפוטית - לעולם

טון ושפה:
- חמה וקרובה כמו חברה מקצועית
- משפטים קצרים - הורים עייפים לא קוראים טקסטים ארוכים
- אמוג'ים מינימלי - רק כשעוזר
- תמיד מאשרת ומבינה לפני שנותנת עצה`;

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

async function sendTimerNotifications() {
  try {
    const now = new Date();
    const in15 = new Date(now.getTime() + 15 * 60000);
    // טבלה לשעות שינה מתוזמנות (bedtime, morning_time)
    const { data: schedules, error } = await supabase
      .from("sleep_schedules")
      .select("id,user_id,whatsapp_number,bedtime,morning_time")
      .or(`bedtime.eq.${now.toISOString()},morning_time.eq.${now.toISOString()}`); // לצורך דוגמה

    if (error) { console.error("Error fetching schedules:", error); return; }

    for (const row of schedules || []) {
      if (!row.whatsapp_number) continue;
      const nextBed = new Date(row.bedtime);
      const nextMorning = new Date(row.morning_time);
      const diffToBed = (nextBed.getTime() - now.getTime()) / 60000;
      const diffToMorning = (nextMorning.getTime() - now.getTime()) / 60000;

      if (diffToBed >= 0 && diffToBed <= 16) {
        await sendWhatsApp(row.whatsapp_number, "תזכורת: עוד 15 דקות מתחיל טקס ההרדמה. האם אתם מוכנים? 🌙");
      }
      if (diffToMorning >= 0 && diffToMorning <= 16) {
        await sendWhatsApp(row.whatsapp_number, "בוקר טוב! איך עבר הלילה? אם פתרתם משהו שווה, ספרו לי כדי שאתעדכן.");
      }
    }
  } catch (err) {
    console.error("Error in sendTimerNotifications:", err);
  }
}

function startScheduledJobs() {
  try {
    new cron.CronJob("*/5 * * * *", sendTimerNotifications, null, true, "Israel");
    console.log("Scheduled jobs started: sendTimerNotifications every 5 minutes.");
  } catch (err) {
    console.error("Error starting scheduled jobs:", err);
  }
}

startScheduledJobs();

async function askClaude(phone, userMessage) {
  const history = await loadHistory(phone);
  history.push({ role: "user", content: userMessage });
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6", max_tokens: 1024, system: SYSTEM_PROMPT, messages: history,
  });
  const assistantText = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  history.push({ role: "assistant", content: assistantText });
  await saveHistory(phone, history);
  return assistantText;
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
        await sendWhatsApp(whatsappNumber, `היי! 🌙 אני נינה, יועצת השינה שלך.\n\nאני כאן 24/7 - כולל שעה 3 בלילה כשהכל מרגיש בלתי אפשרי.\n\nלפני שנתחיל, אני רוצה להכיר אתכם קצת יותר לעומק.\nיש לי כמה שאלות - קחו את הזמן לענות, אין מהר 💜\n\nנתחיל: מה שם התינוק ומה גילו בחודשים?`);
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
  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ message: "Missing userId or email" });
  try {
    await saveUser(userId, email, false);
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

app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body?.trim();
  const from = req.body.From;
  if (!incomingMsg || !from) return res.status(400).send("Missing Body or From");
  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");
  waitUntil((async () => {
    try {
      const reply = await askClaude(from, incomingMsg);
      await sendWhatsApp(from, reply);
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

if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`\n🌙 נינה פועלת על פורט ${PORT}\n`));
}

export default app;

