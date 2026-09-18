import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-slate prose-sm">
        <h1>Terms of Use</h1>
        <p>
          These Terms of Use govern your access to and use of Acreage, a digital agriculture
          marketplace connecting farmers and buyers. By accessing or using our platform, you
          agree to these terms.
        </p>

        <h2>Platform Use</h2>
        <p>
          You may use Acreage to list crops, place orders, and communicate with verified
          trading partners. You agree not to misuse our services, including but not limited
          to posting false information, engaging in fraudulent activity, or interfering with
          platform operations.
        </p>

        <h2>Accounts</h2>
        <p>
          To access certain features, you must register an account. You are responsible for
          maintaining the confidentiality of your password and for all activities that occur
          under your account. You must notify us immediately of any unauthorized use.
        </p>

        <h2>Transactions</h2>
        <p>
          Orders placed through Acreage are between the buyer and farmer directly. Acreage
          facilitates payment processing via M-Pesa but is not a party to the sale. We provide
          an escrow mechanism to protect transactions, and all sales are subject to the
          dispute resolution process outlined in our policies.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All content, trademarks, and other intellectual property on Acreage are the property
          of their respective owners. You retain ownership of content you post, but you grant
          us a license to display it on the platform.
        </p>

        <h2>Dispute Resolution</h2>
        <p>
          Any disputes related to your use of Acreage shall be resolved through mediation
          first, and if unresolved, through binding arbitration in accordance with Kenyan law.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Acreage shall not be liable for any indirect,
          incidental, special, or consequential damages arising out of or in connection with
          your use of the platform.
        </p>

        <h2>Governing Law</h2>
        <p>
          These terms are governed by the laws of Kenya.
        </p>

        <p className="text-xs text-slate-500">
          Last updated: September 17, 2026
        </p>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <Link to="/" className="text-green-600 hover:underline font-medium">
            Back to Acreage
          </Link>
        </div>
      </div>
    </div>
  );
}
