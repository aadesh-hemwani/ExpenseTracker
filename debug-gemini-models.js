async function listModels() {
  const apiKey = "AIzaSyCA00G1EAGPii9_yeg9AY8Q-G7K3z8pLw0";
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Status:", response.status);
    if (!response.ok) {
      console.error("Error:", JSON.stringify(data, null, 2));
    } else {
      console.log("Models:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Fetch Error:", error);
  }
}

listModels();
