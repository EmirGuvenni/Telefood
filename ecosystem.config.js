module.exports = {
  apps : [{
    name   : "TeleFood",
    script : "./dist/index.js",
    env: {
      BOT_TOKEN: "",
      WEBHOOK_URL: "",
      CHAT_ID: "",
    }
  }]
}
