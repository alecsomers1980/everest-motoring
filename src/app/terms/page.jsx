import PageBanner from '@/components/PageBanner';

export default function TermsAndConditions() {
  return (
    <main className="bg-white">
      <PageBanner 
        title="Terms & Conditions" 
        subtitle="The legal terms governing the use of the Everest Motoring website and services." 
      />
      
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl font-display text-slate-800 leading-relaxed">
          
          <div className="mb-12 p-6 bg-slate-50 border-l-4 border-primary rounded-r-lg">
            <h2 className="text-xl font-bold text-slate-950 mb-2 font-display uppercase tracking-wider">Applicable Entity</h2>
            <p className="text-slate-700">
              These terms apply to <strong>DeCar Beleggings (Pty) Ltd</strong>,<br />
              trading as <strong>Everest Motoring</strong><br />
              Company Reg No: 2011/007142/07<br />
              VAT No: 4780257772<br />
              Physical Address: White River, Mpumalanga, South Africa, 1240
            </p>
          </div>

          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">1. Introduction & Acceptance</h2>
              <p className="mb-4">
                By accessing and using the Everest Motoring website, you agree to be bound by these Terms and Conditions in accordance with the Electronic Communications and Transactions Act 25 of 2002 ("ECTA"). If you do not agree with these terms, please discontinue use of this website immediately.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">2. Website Use & Restrictions</h2>
              <p className="mb-4">You agree to use this website only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the website. Specifically, you are prohibited from:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Using the website for any purpose that violates South African law.</li>
                <li>Transmitting any malicious code, viruses, or harmful data.</li>
                <li>Attempting to gain unauthorized access to our systems or user accounts.</li>
                <li>Using automated systems (e.g., bots or scrapers) to extract data without prior written consent.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">3. Intellectual Property</h2>
              <p className="mb-4">
                All content on this website, including but not limited to text, graphics, logos, images, vehicle data, and software, is the intellectual property of DeCar Beleggings (Pty) Ltd (trading as Everest Motoring) or its content suppliers and is protected by South African copyright and intellectual property laws. You may not reproduce, distribute, or commercially exploit any content without our express written permission.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">4. Vehicle Information & Pricing</h2>
              <p className="mb-4">
                We make every effort to ensure that vehicle specifications, mileage, and pricing displayed on the site are accurate. However, errors may occur. We reserve the right to correct any pricing or specification errors and to cancel any orders placed for vehicles listed at an incorrect price. All vehicles are subject to prior sale. A final quotation must be accepted by both parties to form a binding agreement.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">5. Limitation of Liability</h2>
              <p className="mb-4">
                To the maximum extent permitted by South African law, DeCar Beleggings (Pty) Ltd (trading as Everest Motoring), its directors, employees, and affiliates shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of, or inability to use, this website or its content. This includes, but is not limited to, damages for loss of profits, goodwill, data, or other intangible losses.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">6. Electronic Communications & Transactions (ECTA)</h2>
              <p className="mb-4">
                In compliance with ECTA, by submitting an inquiry or application through this website, you acknowledge that your electronic submission constitutes an "expression of interest" and does not constitute a legally binding agreement until a formal contract is signed at our physical premises in Mpumalanga. You have the right to withdraw your expression of interest at any time prior to the conclusion of the final agreement.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">7. Dispute Resolution & Jurisdiction</h2>
              <p className="mb-4">
                Any disputes arising out of or in connection with these terms shall be resolved amicably between the parties. Should resolution fail, the dispute shall be referred to mediation in terms of the rules of the Arbitration Foundation of Southern Africa (AFSA). These terms shall be governed by and construed in accordance with the laws of the Republic of South Africa, and you submit to the exclusive jurisdiction of the courts of Mpumalanga.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                For access to our records as per the Promotion of Access to Information Act (PAIA), please contact our Information Officer, [Information Officer Name].
              </p>
            </div>
          </div>
          
        </div>
      </section>
    </main>
  );
}
