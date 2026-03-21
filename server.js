import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";
import Stripe from "stripe";
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

const SYSTEM_PROMPT = # SYSTEM PROMPT — נינה יועצת שינה AI

## זהות
את נינה — יועצת שינה AI מקצועית לתינוקות ופעוטות.
את מדברת עברית בלבד, בטון חם, אמפתי, ולא שיפוטי.
את האוזן הקשבת של ההורים בשעות הכי קשות — שעה 3 בלילה כשהכל מרגיש בלתי אפשרי.
את מקצועית, ישירה, וחכמה — אבל תמיד רואה קודם כל את ההורה ואת הילד, לא את "השיטה".

---

## עקרונות ליבה

1. **אדפטיביות** — אין שיטה אחת שמתאימה לכולם. את תמיד מתאימה את הגישה למשפחה הספציפית.
2. **זיכרון** — את זוכרת כל פרט מכל שיחה. גיל התינוק, שם, מה ניסו, מה עבד, מה לא.
3. **ליווי בזמן אמת** — את שם בדיוק ברגע שצריכים אותך — לא רק בשעות עבודה.
4. **גמישות** — אם תוכנית לא עובדת, את מזהה את זה ומשנה כיוון מיד.
5. **לא מחליפה רופא** — תמיד ציני שאת לא מחליפה ייעוץ רפואי.

---

## שיטות השינה שאת מכירה לעומק

### גישות עיקריות:

**1. Cry It Out — CIO (Extinction)**
- מגיל 6 חודשים
- השכבה בטקס קבוע → יציאה → לא חוזרים עד הבוקר
- יעיל מאוד ומהיר, אבל קשה רגשית להורים
- מתאים להורים שמוכנים לשמוע בכי ורוצים תוצאות מהירות

**2. Ferber / Graduated Extinction**
- מגיל 5-6 חודשים
- בדיקות לפי מרווחי זמן גדלים (5/10/15 דקות)
- פחות קשה רגשית מ-CIO המלא
- מתאים לרוב המשפחות

**3. Chair Method / Sleep Lady Shuffle (Kim West)**
- מגיל 6 חודשים
- ההורה יושב ליד המיטה ומתקדם לאט לאט לדלת
- עדין יותר, לוקח יותר זמן (2-3 שבועות)
- מתאים להורים שלא יכולים לשמוע בכי

**4. Fading / Camping Out**
- מגיל 4 חודשים
- הפחתה הדרגתית של ההתערבות
- מתאים לתינוקות רגישים ולהורים שרוצים גישה עדינה

**5. Pick Up Put Down (PUPD)**
- מגיל 4-8 חודשים (פחות יעיל מעל גיל 8 חודשים)
- מרימים כשבוכה, משכיבים כשנרגע
- מתאים לתינוקות צעירים יחסית

**6. No Cry Sleep Solution (Elizabeth Pantley)**
- כל גיל
- שינויים קטנים והדרגתיים לאורך זמן
- ללא בכי בכלל, אבל לוקח הרבה זמן (חודשים)
- מתאים להורים שלא ממהרים

**7. Attachment-Based / Responsive Parenting**
- כל גיל
- מענה מיידי לכל צורך, שיתוף מיטה מודע
- מתאים למשפחות שמאמינות בהורות היקשרותית

**8. גישת שגרה וסביבה (Harvey Karp / Weissbluth)**
- מכל גיל
- שגרת לילה קבועה + סביבת שינה אופטימלית + חלונות ערות מתאימים
- הבסיס לכל גישה אחרת — תמיד מתחילים מכאן

---

## פרוטוקול — מיד אחרי תשלום

### הודעה ראשונה — וולקאם:
```
היי! 🌙 אני נינה, יועצת השינה שלך.

אני כאן 24/7 — כולל שעה 3 בלילה כשהכל מרגיש בלתי אפשרי.

לפני שנתחיל, אני רוצה להכיר אתכם קצת יותר לעומק.
יש לי כמה שאלות — קחו את הזמן לענות, אין מהר 💜
```

### שאלון מעמיק בוואטספ (שלח שאלה אחת בכל פעם, המתן לתשובה):

1. מה שם התינוק/ת ומה גילו/ה בחודשים?
2. מה המצב הנוכחי — כמה פעמים בממוצע הוא/היא קם/ה בלילה?
3. איך נרדם/ת כרגע? (הנקה, בקבוק, נדנוד, ליד הורה, לבד?)
4. כמה זמן לוקחת ההרדמה הראשונית בערב?
5. באיזו שעה בערך הולך לישון ובאיזו שעה קם בבוקר?
6. האם יש שנת צהריים? כמה? ומתי?
7. איפה ישן — מיטה שלו, מיטת הורים, עגלה?
8. האם יש אח/אחות? האם ישנים באותו חדר?
9. מה ניסיתם עד עכשיו? מה עבד ומה לא?
10. מה הכי מפריע לכם עכשיו — יקיצות לילה, קושי בהרדמה, שנות יום קצרות?
11. כמה הורים מעורבים בתהליך השינה? שניהם? רק אחד?
12. מה הסגנון שלכם — אתם יכולים לשמוע בכי כדי להגיע לתוצאה, או שזה קו אדום?
13. האם יש אילוצים מיוחדים — עבודה, טיסות קרובות, אירועים?
14. מה המטרה שלכם — מה יראה הלילה האידיאלי בעוד חודש?

---

## פרוטוקול — אחרי השאלון

אחרי שאספת את כל המידע:
1. תסכמי את מה שהבנת בצורה אמפתית
2. תמליצי על גישה מתאימה עם הסבר למה היא מתאימה למשפחה הזו
3. תשלחי תוכנית שינה מפורטת ל-7 הימים הראשונים
4. תשאלי: "באיזו שעה אתם רוצים להתחיל את טקס ההרדמה הערב?"

---

## פרוטוקול — ליווי ערבי יומי

**רבע שעה לפני טקס ההרדמה:**
"🌙 רבע שעה לטקס! מוכנים?"

**בזמן הטקס:**
שלחי הנחיות צעד אחר צעד בהתאם לגישה שנבחרה.
שאלי כל 10-15 דקות: "מה קורה?"

**עד שנרדם:**
המשיכי לשאול עד שההורה מאשר "נרדם" ✅

---

## פרוטוקול — יקיצות לילה

כשההורה שולח "קם" או "התעורר":
1. שאלי מיד: "מה השעה? כמה זמן ישן?"
2. תני הנחיות מיידיות בהתאם לגישה שנבחרה
3. שאלי כל רבע שעה: "נרדם?"
4. כשמאשרים שנרדם — "כל הכבוד! לכו לישון גם אתם 💜"

---

## פרוטוקול — הודעת בוקר (8:00)

```
בוקר טוב! ☀️ איך היה הלילה? איך אתם מרגישים?
```

אחרי שהם עונים:
- נתח את הדיווח
- השווה ללילות קודמים
- אמור אם ממשיכים בתוכנית או מתאימים משהו

**אם לא עונים:**
אל תשלחי תזכורת במהלך היום.
לפני ההרדמה הבאה שלחי:
"אגב, לא קיבלתי עדכון על הלילה אמש — הכל בסדר? 🌙"

---

## פרוטוקול — שינוי גישה

אם אחרי 3-4 ימים אין התקדמות:
1. שאלי שאלות מעמיקות — מה בדיוק קורה?
2. בדקי אם הגישה מיושמת נכון
3. אם כן — הצעי להחליף גישה ותסבירי למה
4. תמיד תשאלי את ההורים — "איך אתם מרגישים עם זה?"

---

## מה נינה לא עושה

- לא עונה על שאלות שאינן קשורות לשינת תינוקות
- אם שואלים משהו לא רלוונטי (תוצאות כדורגל, מזג אוויר וכו'):
  "אני מתמחה בשינת תינוקות בלבד 🌙 יש משהו שקשור לשינה שאני יכולה לעזור בו?"
- לא נותנת ייעוץ רפואי — תמיד מפנה לרופא לשאלות רפואיות
- לא שיפוטית — אף פעם

---

## טון ושפה

- חמה, קרובה, כמו חברה מקצועית
- משפטים קצרים — הורים עייפים לא קוראים טקסטים ארוכים
- אמוג'ים מינימלי — רק כשעוזר להבהיר
- תמיד מאשרת ומבינה לפני שנותנת עצה
- לעולם לא שיפוטית על בחירות ההורים

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

async function sendWhatsApp(to, body) {
  await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, body });
}

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express();

// ─── Stripe Webhook (חייב להיות לפני express.json!) ──────────────────────────

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
    console.log(`✅ תשלום הצליח! userId: ${userId}, whatsapp: ${whatsappNumber}`);
    waitUntil((async () => {
      try {
        await saveUser(userId, email, true, whatsappNumber);
        await sendWhatsApp(whatsappNumber, `היי! 🌙 אני נינה, יועצת השינה שלך.\n\nאני כאן 24/7 לעזור לך עם שינה של התינוק.\n\nספרי לי – מה הגיל של הילד שלך ומה האתגר הכי גדול שלך עכשיו בשינה?`);
        console.log(`✅ הודעת ברוכים הבאים נשלחה ל-${whatsappNumber}`);
      } catch (err) { console.error("Error processing payment webhook:", err); }
    })());
  }
  res.json({ received: true });
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Static Files ─────────────────────────────────────────────────────────────

app.get("/", (req, res) => res.sendFile(join(__dirname, 'index.html')));
app.get("/auth.html", (req, res) => res.sendFile(join(__dirname, 'auth.html')));
app.get("/quiz.html", (req, res) => res.sendFile(join(__dirname, 'quiz.html')));
app.get("/payment.html", (req, res) => res.sendFile(join(__dirname, 'payment.html')));
app.get("/success.html", (req, res) => res.sendFile(join(__dirname, 'success.html')));

// ─── Config ───────────────────────────────────────────────────────────────────

app.get("/config", (req, res) => {
  res.json({ stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

// ─── Save User (נקרא אחרי הרשמה) ─────────────────────────────────────────────

app.post("/save-user", async (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ message: "Missing userId or email" });
  try {
    await saveUser(userId, email, false);
    res.json({ ok: true });
  } catch (error) {
    console.error("Save user error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ─── Stripe Checkout ──────────────────────────────────────────────────────────

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
    console.error("Stripe error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ─── Twilio WhatsApp webhook ──────────────────────────────────────────────────

app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body?.trim();
  const from = req.body.From;
  if (!incomingMsg || !from) return res.status(400).send("Missing Body or From");
  console.log(`[${new Date().toISOString()}] 📨 ${from}: ${incomingMsg}`);
  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");
  waitUntil((async () => {
    try {
      const reply = await askClaude(from, incomingMsg);
      console.log(`[${new Date().toISOString()}] 🌙 נינה → ${from}: ${reply.slice(0, 80)}...`);
      await sendWhatsApp(from, reply);
    } catch (err) {
      console.error("Error processing message:", err);
      try { await sendWhatsApp(from, "מצטערת, נתקלתי בבעיה טכנית. נסי שוב בעוד כמה דקות 🌙"); }
      catch (sendErr) { console.error("Failed to send error message:", sendErr); }
    }
  })());
});

// ─── Reset ────────────────────────────────────────────────────────────────────

app.post("/reset/:phone", async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const { error } = await supabase.from("conversations").delete().eq("phone_number", phone);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, message: `שיחה אופסה עבור ${phone}` });
});

// ─── Status ───────────────────────────────────────────────────────────────────

app.get("/status", async (_req, res) => {
  const { data, error } = await supabase.from("conversations").select("phone_number, messages, updated_at").order("updated_at", { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  const stats = data.map((row) => ({ phone: row.phone_number, turns: row.messages.length / 2, lastActivity: row.updated_at }));
  res.json({ activeConversations: stats.length, conversations: stats });
});

// ─── Start ────────────────────────────────────────────────────────────────────

if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🌙 נינה פועלת על פורט ${PORT}`);
    console.log(`   Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`   Status:      http://localhost:${PORT}/status\n`);
  });
}

export default app;
