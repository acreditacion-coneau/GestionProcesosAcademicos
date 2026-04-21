export const emailService = {
  sendNotification: async (to: string, role: string, subject: string, body: string) => {
    // Simulated network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    console.log(`[EMAIL ENVIADO a ${role} (${to})]`);
    console.log(`Asunto: ${subject}`);
    console.log(`Cuerpo: \n${body}`);
    return true;
  }
};
