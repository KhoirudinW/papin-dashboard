const generatePairCode = () => {
    const randomNum = Math.floor(100 + Math.random() * 900); // Menghasilkan 100-999
    return `PAP${randomNum}`;
  };