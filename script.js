const USER_ID = "YOUR_USER_ID";
const AUTH_TOKEN = "7TV_TOKEN"; // Replace with your 7tv token | can fetch by running `localStorage.getItem("7tv-token")` in your browser's console (must be logged into the same account as the USER_ID variable)
const CHECK_INTERVAL = 10000;

const GQL_ENDPOINT = "https://7tv.io/v4/gql";

async function gqlRequest(query, variables = {}) {
  const response = await fetch(GQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json();
}

async function getPendingEditorRequests() {
  const query = `
    query EditorCheck {
      users {
        user(id: "${USER_ID}") {
          editorFor {
            state
            userId
          }
        }
      }
    }
  `;

  const data = await gqlRequest(query);
  const editorList = data?.data?.users?.user?.editorFor ?? [];

  return editorList
    .filter(entry => entry.state === "PENDING")
    .map(entry => entry.userId);
}

async function acceptEditorRequest(editorId) {
  const mutation = `
    mutation AcceptEditor {
      userEditors {
        editor(editorId: "${USER_ID}", userId: "${editorId}") {
          updateState(state: ACCEPT) {
            state
          }
        }
      }
    }
  `;

  const data = await gqlRequest(mutation);

  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data;
}

async function checkAndAccept() {
  console.log(`[${new Date().toLocaleTimeString()}] Checking for pending editor requests...`);

  try {
    const pending = await getPendingEditorRequests();

    if (pending.length === 0) {
      console.log("No pending requests found.");
      return;
    }

    console.log('Found ${pending.length} pending request(s): ${pending.join(", ")}`);

    for (const editorId of pending) {
      try {
        await acceptEditorRequest(editorId);
        console.log(`Accepted editor request from: ${editorId}`);
      } catch (err) {
        console.error(`Failed to accept ${editorId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error during check:", err.message);
  }
}

// Run immediately, then on interval
checkAndAccept();
setInterval(checkAndAccept, CHECK_INTERVAL);

console.log(`Auto-accepter started. Checking every ${CHECK_INTERVAL / 1000}s for user ${USER_ID}`);
