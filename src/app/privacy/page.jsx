import PageBanner from '@/components/PageBanner';

export default function PrivacyPolicy() {
  return (
    <main className="bg-white">
      <PageBanner 
        title="Privacy Policy" 
        subtitle="How we collect, use, and protect your personal information in compliance with POPIA." 
      />
      
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl font-display text-slate-800 leading-relaxed">
          
          <div className="mb-12 p-6 bg-slate-50 border-l-4 border-primary rounded-r-lg">
            <h2 className="text-xl font-bold text-slate-950 mb-2 font-display uppercase tracking-wider">Company Details</h2>
            <p className="text-slate-700">
              <strong>DeCar Beleggings (Pty) Ltd</strong><br />
              Trading as: <strong>Everest Motoring</strong><br />
              Company Reg No: 2011/007142/07<br />
              VAT No: 4780257772<br />
              Physical Address: White River, Mpumalanga, South Africa, 1240
            </p>
          </div>

          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">1. Introduction</h2>
              <p className="mb-4">
                DeCar Beleggings (Pty) Ltd, trading as Everest Motoring ("we", "us", or "our") is committed to protecting and respecting your privacy in accordance with the Protection of Personal Information Act 4 of 2013 ("POPIA"). This Privacy Policy explains how we collect, use, store, and share your personal information when you visit our dealership or use our website.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">2. Information Officer</h2>
              <p className="mb-4">
                In terms of POPIA, our Information Officer is responsible for ensuring our compliance. Queries regarding this policy or your personal information should be directed to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li><strong>Information Officer:</strong> [Information Officer Name]</li>
                <li><strong>Email:</strong> sales@everestmotoring.co.za</li>
                <li><strong>PAIA Manual:</strong> <a href="#" className="text-primary-ink hover:underline">[PAIA Manual Link]</a></li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">3. Information We Collect</h2>
              <p className="mb-4">We may collect the following categories of personal information:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li><strong>Identity & Contact Data:</strong> First name, last name, email address, phone number, and physical address.</li>
                <li><strong>Financial Data:</strong> Bank account details, credit history, and income information (required for vehicle financing applications).</li>
                <li><strong>Transaction Data:</strong> Details of vehicle purchases, services, and payments.</li>
                <li><strong>Technical Data:</strong> IP address, browser type and version, time zone setting, and browsing behavior on our website.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">4. Purpose of Processing</h2>
              <p className="mb-4">We process your personal information for the following specific purposes:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>To process vehicle finance applications and perform credit checks (with your explicit consent).</li>
                <li>To manage our business relationship with you and provide customer service.</li>
                <li>To notify you of updates to vehicles matching your profile or service reminders.</li>
                <li>To comply with legal obligations under the National Credit Act, Financial Intelligence Centre Act (FICA), and SARS requirements.</li>
                <li>To detect and prevent fraud or other illegal activities.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">5. Third-Party Sharing</h2>
              <p className="mb-4">
                We may share your information with third parties only where necessary for the purposes outlined above, or where required by law. These parties include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Vehicle financing institutions and banks.</li>
                <li>Credit bureaus.</li>
                <li>Insurance providers.</li>
                <li>Legal and regulatory authorities (SARS, FIC).</li>
                <li>IT service providers who process data on our behalf under strict contractual obligations.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">6. Storage & Security</h2>
              <p className="mb-4">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction. Your data is stored securely on servers located within the Republic of South Africa. 
              </p>
              <p className="mb-4 font-semibold text-slate-800 bg-slate-50 p-4 border-l-4 border-primary">
                <strong>Strict Document Deletion Policy:</strong> To ensure your absolute privacy, any financial or identity documents uploaded directly by you via our client portal are automatically and permanently deleted from our servers as soon as the vehicle associated with your application is marked as Sold. 
              </p>
              <p className="mb-4">
                Other general administrative records are retained only for as long as necessary to fulfill the purposes for which they were collected, or as required by law (typically up to 5 years for financial records).
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2 font-display uppercase tracking-tight">7. Your Rights Under POPIA</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Request access to your personal information.</li>
                <li>Request the correction or deletion of inaccurate or irrelevant information.</li>
                <li>Object to the processing of your personal information at any time.</li>
                <li>Withdraw your consent for direct marketing.</li>
                <li>Lodge a complaint with the Information Regulator (South Africa) if you believe your rights have been infringed.</li>
              </ul>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Last updated: April {new Date().getFullYear()}. We reserve the right to update this policy. Any changes will be published on this page.
              </p>
            </div>
          </div>
          
        </div>
      </section>
    </main>
  );
}
