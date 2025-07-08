import mercadopago from 'mercadopago';

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.warn(
    'Variável de ambiente MERCADOPAGO_ACCESS_TOKEN não definida. A integração com Mercado Pago pode não funcionar.'
  );
  // Em um ambiente de produção, você pode querer lançar um erro aqui:
  // throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

// Configura o SDK do Mercado Pago com o Access Token
// O SDK pode reclamar se o token não estiver definido, mas tentamos configurar mesmo assim
// para não quebrar a importação em ambientes onde ele não é estritamente necessário (ex: build sem acesso a env vars de runtime)
try {
  mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN!, // O '!' assume que foi verificado ou será tratado em uso
  });
} catch (error) {
    console.error("Falha ao configurar o SDK do MercadoPago. Verifique o MERCADOPAGO_ACCESS_TOKEN.", error);
}


export default mercadopago;
