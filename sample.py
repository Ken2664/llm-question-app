import google.generativeai as genai

genai.configure(api_key="AIzaSyB4ZMmhHM3l_dFagtiGY-4btuDTrTz6i94")
model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content("Explain how AI works")
print(response.text)