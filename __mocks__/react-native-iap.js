module.exports = {
  initConnection: jest.fn().mockResolvedValue(true),
  endConnection: jest.fn().mockResolvedValue(true),
  getSubscriptions: jest.fn().mockResolvedValue([]),
  getAvailablePurchases: jest.fn().mockResolvedValue([]),
  requestPurchase: jest.fn().mockResolvedValue(undefined),
  finishTransaction: jest.fn().mockResolvedValue(undefined),
  purchaseUpdatedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  purchaseErrorListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  flushFailedPurchasesCachedAsPendingAndroid: jest.fn().mockResolvedValue(undefined),
};
