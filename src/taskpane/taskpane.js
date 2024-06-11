
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AzureChatOpenAI } from "@langchain/azure-openai";
import { StringOutputParser, JsonOutputFunctionsParser } from "@langchain/core/output_parsers";
import { promptt } from './prompt';
// import { JsonOutputFunctionsParser } from "langchain/output_parsers";

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";
    document.getElementById("run").onclick = run;
    document.getElementById("copy-response").onclick = copyResponse;
    document.getElementById("send-email").onclick = sendEmail;
    document.getElementById("item-response").style.display = "none";
  }
});

export async function run() {
  // Get the selected values from the dropdowns
  const languageSelect = document.getElementById("select-language");
  const styleSelect = document.getElementById("select-style");
  let selectedLanguage = languageSelect.value;
  let selectedStyle = styleSelect.value;

    // Update the values based on their initial values
  if (selectedLanguage === "en") {
    selectedLanguage = "Australian English";
  } else if (selectedLanguage === "es") {
    selectedLanguage = "Spanish";
  } else if (selectedLanguage === "fr") {
    selectedLanguage = "French";
  }

  if (selectedStyle === "long") {
    selectedStyle = "well detailed long response";
  } else if (selectedStyle === "short") {
    selectedStyle = "short response with key information";
  } 
  // Log the selected values to the console
  console.log(`Selected Language: ${selectedLanguage}`);
  console.log(`Selected Style: ${selectedStyle}`);

  const item = Office.context.mailbox.item;
  let emailsubject = item.subject;
  let senderEmail = item.from.emailAddress;
  let senderName = item.from.displayName;
  console.log(`Sender: ${senderName} <${senderEmail}>`);
  let reciver = senderName;
 
  let toRecipients = item.to.map(recipient => `${recipient.displayName} <${recipient.emailAddress}>`).join(", ");
  let sender = toRecipients;
  console.log(`To: ${toRecipients}`);
  
  item.body.getAsync(Office.CoercionType.Text, async function (result) {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      let emailbody = result.value;

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
        var emailresponse = await chain.invoke({
          body: emailbody,
          subject: emailsubject,
          sender: sender,
          reciver: reciver,
          language: selectedLanguage,
          style: selectedStyle,
        });

        var emailtext = emailresponse.action_item;
        console.log(emailresponse);
        emailresponse = emailresponse.replace(/\*\*(.*?)\*\*/g, "$1");
        // Ensure proper HTML formatting
        document.getElementById("item-response").innerHTML = "<br/>" + emailresponse.replace(/\n/g, "<br>");
        document.getElementById("item-response").style.display = "block";
        document.getElementById("send-email").style.display = "block";
      } catch (error) {
        console.error(error.message);
      }
    } else {
      console.error(result.error.message);
    }
  });
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