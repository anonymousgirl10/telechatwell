const { Telegraf } = require("telegraf");
const express = require("express");
const { webhookCallback } = require("telegraf");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN || "");
const waitingList = [];
const chatSessions = {};
let blockerEnabled = false;
// Handle "/start" command
bot.command("start", (ctx) => {
  const description =
    "Welcome to the Encrypted Pair Chat Bot!\n\n" +
    "This chat bot pairs you with a random stranger for an encrypted chat session.\n\n" +
    "Rules:\n" +
    "- Speak in English.\n" +
    // ... (remaining description)

    ctx.reply(description);
});
// Handle "/find" command
bot.command("find", (ctx) => {
  const userId = ctx.message.chat.id;
  const activeUsers = Object.keys(chatSessions).length + waitingList.length;
  const chatSessionCount = Object.keys(chatSessions).length / 2;
  const waitingListCount = waitingList.length;
  ctx.reply(
    `Searching for a stranger...\nActive users: ${activeUsers}\nChat connect pairs: ${chatSessionCount}\nWaiting Lists: ${waitingListCount}`,
  );
  if (userId in chatSessions) {
    ctx.reply("You are already in a chat. Use /end to leave the chat.");
  } else if (userId in waitingList) {
    ctx.reply(
      "You are already in the waiting list. Please wait for a partner to be assigned.",
    );
  } else {
    waitingList.push(userId);
    tryMatchPartners();
  }
});
// ... (previous code)
// Handle "/blockon" command
bot.command("blockon", (ctx) => {
  blockerEnabled = true;
  ctx.reply("Word blocking is enabled.");
});
// Handle "/unblock" command
bot.command("unblock", (ctx) => {
  blockerEnabled = false;
  ctx.reply("Word blocking is disabled.");
});
// Modify the handle_message function to check if blocking is enabled
bot.on("text", (ctx) => {
  const userId = ctx.message.chat.id;
  const text = ctx.message.text;
  if (userId in chatSessions) {
    const partnerId = chatSessions[userId];
    if (partnerId) {
      if (blockerEnabled && containsBlockedWord(text)) {
        ctx.reply(
          "Your partner enabled the blocker. Please refrain from using toxic or inappropriate language and respect your partner.",
        );
        return;
      }
      bot.telegram.sendMessage(partnerId, text);
    } else {
      ctx.reply(
        "You don't have an ongoing chat. Use /find to search for a partner to chat with.",
      );
    }
  } else {
    ctx.reply(
      "You don't have an ongoing chat. Use /find to search for a partner to chat with.",
    );
  }
});
// Function to check if the message contains blocked words
function containsBlockedWord(message) {
  const blockedWords = [
    // List of blocked words (same as in Python code)
  ];
  const lowerCaseMessage = message.toLowerCase();

  for (const word of blockedWords) {
    if (lowerCaseMessage.includes(word)) {
      return true;
    }
  }

  return false;
}

// Function to try matching partners from the waiting list
function tryMatchPartners() {
  while (waitingList.length >= 2) {
    const userId1 = waitingList.shift();
    const userId2 = waitingList.shift();

    chatSessions[userId1] = userId2;
    chatSessions[userId2] = userId1;

    bot.telegram.sendMessage(
      userId1,
      "Partner found! Remember to speak in English with your partner.",
    );
    bot.telegram.sendMessage(
      userId2,
      "Partner found! Remember to speak in English with your partner.",
    );
  }
}

// Start the server
if (process.env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());

  const botPath = 'https://lucky-frog-culottes.cyclic.app/'; // Replace with your desired path
  bot.telegram.setWebhook(`https://your-bot-url${botPath}`);
  app.use(bot.webhookCallback(botPath));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
}
 else {
  // Use Long Polling for development
  bot.launch();
}
