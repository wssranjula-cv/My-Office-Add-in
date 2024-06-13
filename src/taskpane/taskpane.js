import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AzureChatOpenAI } from "@langchain/azure-openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { promptt } from './prompt';

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    const sideloadMsg = document.getElementById("sideload-msg");
    const appBody = document.getElementById("app-body");
    const runButton = document.getElementById("run");
    const copyResponseButton = document.getElementById("copy-response");
    const sendEmailButton = document.getElementById("send-email");
    const itemResponse = document.getElementById("item-response");

    sideloadMsg.style.display = "none";
    appBody.style.display = "flex";
    runButton.onclick = run;
    copyResponseButton.onclick = copyResponse;
    sendEmailButton.onclick = sendEmail;
    itemResponse.style.display = "none";
  }
});

export async function run() {
  const createResponseButton = document.getElementById("run");
  const spinner = document.getElementById("spinner");
  const languageSelect = document.getElementById("select-language");
  const styleSelect = document.getElementById("select-style");
  const itemResponse = document.getElementById("item-response");
  const sendEmailButton = document.getElementById("send-email");

  // Show the spinner and disable the button
  spinner.style.display = "block";
  createResponseButton.disabled = true;
  createResponseButton.style.cursor = "not-allowed";
  createResponseButton.style.opacity = "0.5";

  // Get the selected values from the dropdowns
  const selectedLanguage = getSelectedLanguage(languageSelect.value);
  const selectedStyle = getSelectedStyle(styleSelect.value);

  // Log the selected values to the console
  console.log(`Selected Language: ${selectedLanguage}`);
  console.log(`Selected Style: ${selectedStyle}`);

  const item = Office.context.mailbox.item;
  const emailsubject = item.subject;
  const senderEmail = item.from.emailAddress;
  const senderName = item.from.displayName;
  console.log(`Sender: ${senderName} <${senderEmail}>`);

  const toRecipients = item.to.map(recipient => `${recipient.displayName} <${recipient.emailAddress}>`).join(", ");
  const firstName = toRecipients.split(' ')[0];
  console.log(firstName);

  item.body.getAsync(Office.CoercionType.Text, async function (result) {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const emailbody = result.value;

      const prompt = ChatPromptTemplate.fromTemplate(promptt);
      const parser = new StringOutputParser();
      const model = new AzureChatOpenAI({
        azureOpenAIEndpoint: "https://stratagpt.openai.azure.com/",
        azureOpenAIApiKey: "4901ec82ba5641fda9db1d6ee24db74e",
        azureOpenAIApiDeploymentName: "strata-openai",
        temperature: 0.01,
      });

      const chain = prompt.pipe(model).pipe(parser);

      try {
        let emailresponse = await chain.invoke({
          body: emailbody,
          subject: emailsubject,
          sender: firstName,
          language: selectedLanguage,
          style: selectedStyle,
        });

        emailresponse = formatEmailResponse(emailresponse);
        console.log(emailresponse);

        // Ensure proper HTML formatting
        itemResponse.innerHTML = "<br/>" + emailresponse.replace(/\n/g, "<br>");
        itemResponse.style.display = "block";
        sendEmailButton.style.display = "block";
      } catch (error) {
        console.error(error.message);
      } finally {
        // Hide the spinner and re-enable the button
        spinner.style.display = "none";
        createResponseButton.disabled = false;
        createResponseButton.style.cursor = "pointer";
        createResponseButton.style.opacity = "1";
      }
    } else {
      console.error(result.error.message);
      // Hide the spinner and re-enable the button in case of error
      spinner.style.display = "none";
      createResponseButton.disabled = false;
      createResponseButton.style.cursor = "pointer";
      createResponseButton.style.opacity = "1";
    }
  });
}

function getSelectedLanguage(language) {
  const languageMap = {
    "en": "Australian English",
    "es": "Spanish",
    "fr": "French",
    "ch": "Chinese",
    "mn": "Mandarin",
    "gr": "Greek",
    "ar": "Arabic"
  };
  return languageMap[language] || language;
}

function getSelectedStyle(style) {
  const styleMap = {
    "long": "well clear ,detailed  very very long response ",
    "meduim": "well detailed medium response",
    "short": "short response with key information"
  };
  return styleMap[style] || style;
}

function formatEmailResponse(response) {
  response = response.replace(/\*\*(.*?)\*\*/g, "$1");
  const tripleBacktickPattern = /^```[a-z]*\n([\s\S]*?)\n```$/;
  const match = response.match(tripleBacktickPattern);
  if (match) {
    response = match[1];
  }
  return response;
}

function copyResponse() {
  const responseElement = document.getElementById("item-response");
  const range = document.createRange();
  range.selectNodeContents(responseElement);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  try {
    document.execCommand("copy");
    displayMessage("Response copied to clipboard!");
  } catch (err) {
    console.error("Failed to copy text: ", err);
    displayMessage("Failed to copy text.");
  }
}

function displayMessage(message) {
  const messageElement = document.getElementById("message");
  messageElement.innerText = message;
  messageElement.style.display = "block";
  setTimeout(() => {
    messageElement.style.display = "none";
  }, 3000);
}

function sendEmail() {
  const emailresponse = document.getElementById("item-response").innerHTML;
  Office.context.mailbox.item.displayReplyForm({
    htmlBody: emailresponse
  });
}