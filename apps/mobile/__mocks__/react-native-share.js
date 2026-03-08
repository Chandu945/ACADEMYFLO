const Share = {
  open: jest.fn(() => Promise.resolve({ success: true })),
};

module.exports = { default: Share };
