// Demo policies for RAG. Each section becomes one retrievable passage.
export const POLICIES = [
  {
    slug: 'returns', title: 'Returns Policy', category: 'returns', version: '2.1', effectiveDate: '2026-01-01',
    sections: [
      ['1. Return window', 'Smartphones, laptops and tablets can be returned within 7 days of delivery or in-store purchase. All other products can be returned within 14 days of delivery or in-store purchase. The item must be returned with its original packaging, accessories and proof of purchase.'],
      ['2. Non-returnable items', 'Opened earbuds and in-ear headphones cannot be returned for hygiene reasons unless they are faulty. Gift cards, software licences and items marked final sale are not returnable.'],
      ['3. Condition of returned items', 'Returned items must be unused and in resaleable condition. Items with physical damage, missing parts or removed serial numbers may be refused or refunded at a reduced amount after inspection.'],
    ],
  },
  {
    slug: 'exchanges', title: 'Exchange Policy', category: 'exchanges', version: '1.4', effectiveDate: '2026-01-01',
    sections: [
      ['1. Eligibility', 'Customers may exchange an item for a different size, colour or model within 14 days of purchase, subject to stock availability. Exchanges for a higher-priced item require payment of the price difference.'],
      ['2. Defective on arrival', 'If a product is dead on arrival or has a manufacturing defect reported within 7 days, we will replace it with the same model at no cost. If the model is out of stock, a refund or an equivalent model is offered.'],
    ],
  },
  {
    slug: 'warranty', title: 'Warranty Policy', category: 'warranty', version: '3.0', effectiveDate: '2026-02-01',
    sections: [
      ['1. Standard warranty', 'Laptops, smartphones and tablets carry a 12-month manufacturer warranty covering manufacturing defects. Headphones, earbuds, speakers and accessories carry a 6-month warranty.'],
      ['2. Extended warranty', 'An optional extended warranty adds 12 months of coverage and must be purchased within 30 days of buying the product. It covers hardware faults but not accidental damage.'],
      ['3. What is not covered', 'Warranty does not cover accidental damage, liquid damage, unauthorised repairs, cosmetic wear, or battery degradation below the manufacturer threshold. A valid invoice is required for all claims.'],
    ],
  },
  {
    slug: 'delivery', title: 'Delivery Policy', category: 'delivery', version: '1.8', effectiveDate: '2026-01-15',
    sections: [
      ['1. Delivery times', 'Metro cities receive standard delivery in 2 to 4 business days. Other locations take 5 to 8 business days. Express delivery within 24 hours is available in Bengaluru, Mumbai and Delhi for an additional fee.'],
      ['2. Delivery charges', 'Delivery is free for orders above Rs 999. A flat fee of Rs 79 applies to smaller orders. Express delivery costs Rs 199.'],
      ['3. Failed delivery', 'We attempt delivery up to three times. If all attempts fail, the order is returned to the store and refunded after the item is received back.'],
    ],
  },
  {
    slug: 'refunds', title: 'Refund Policy', category: 'refunds', version: '2.0', effectiveDate: '2026-01-01',
    sections: [
      ['1. Refund timeline', 'Approved refunds are issued to the original payment method within 5 to 7 business days of the returned item passing inspection. Cash purchases are refunded as store credit or by bank transfer.'],
      ['2. Refund amount', 'The full purchase price is refunded for eligible returns. Delivery fees are refunded only if the return is due to a defective or incorrect item. Express delivery fees are non-refundable otherwise.'],
    ],
  },
];
