'use client';

import { X, FileText } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  if (!isOpen) return null;

  const handleAccept = () => {
    onAccept?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn" onClick={onClose}>
      {/* Modal */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-4xl relative my-8 animate-slideUp overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B44A3]/95 to-[#1a5fd4]/95 backdrop-blur-md text-white p-6 rounded-t-2xl relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-6 text-white hover:text-white/80 transition p-2 rounded-full hover:bg-white/10 z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-center">ข้อกำหนดและเงื่อนไขการให้บริการ</h1>
          </div>
          <p className="text-center text-blue-100 text-sm mt-2">Terms of Service</p>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[calc(100vh-250px)] overflow-y-auto">
          <div className="space-y-6 text-gray-700">
            {/* Header Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-[#0B44A3]">เว็บไซต์: Walk4You</p>
              <p className="text-sm text-gray-600 mt-1">ปรับปรุงล่าสุด: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <p className="text-base leading-relaxed">
              ยินดีต้อนรับสู่ <strong>Walk4You</strong> ("บริการ", "เรา", "เว็บไซต์") แพลตฟอร์มตัวกลางซื้อขายสินค้าสำหรับนักศึกษาและบุคลากรของมหาวิทยาลัยกรุงเทพ ("BU")
            </p>

            <p className="text-base leading-relaxed">
              การเข้าถึงและการใช้บริการนี้อยู่ภายใต้ข้อกำหนดและเงื่อนไขเหล่านี้ ("ข้อกำหนด") โปรดอ่านอย่างละเอียด การที่คุณเข้าถึงหรือใช้บริการนี้ถือว่าคุณตกลงที่จะผูกพันตามข้อกำหนดเหล่านี้
            </p>

            {/* Section 1 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">1. คำจำกัดความ</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>"ผู้ใช้งาน":</strong> หมายถึงบุคคลใดก็ตามที่เข้าถึงหรือใช้งานเว็บไซต์</li>
                <li><strong>"ผู้ซื้อ":</strong> หมายถึงผู้ใช้งานที่ทำการสั่งซื้อสินค้าบนแพลตฟอร์ม</li>
                <li><strong>"ผู้ขาย":</strong> หมายถึงผู้ใช้งานที่ได้รับการอนุมัติให้ลงขายสินค้าบนแพลตฟอร์ม</li>
                <li><strong>"BUMail":</strong> หมายถึง อีเมลอย่างเป็นทางการที่ออกโดยมหาวิทยาลัยกรุงเทพ (เช่น @bumail.net หรือ @bu.ac.th)</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">2. บทบาทของ Walk4You</h2>
              <p className="leading-relaxed">
                <strong>Walk4You</strong> ทำหน้าที่เป็น <strong>สื่อกลาง (Marketplace)</strong> เท่านั้น เราไม่มีส่วนเกี่ยวข้องกับการทำธุรกรรมหรือสัญญาใดๆ ระหว่างผู้ซื้อและผู้ขาย เราไม่ใช่ตัวแทนของฝ่ายใดฝ่ายหนึ่ง และไม่รับประกันคุณภาพ ความปลอดภัย หรือความถูกต้องตามกฎหมายของสินค้าที่ลงขาย
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">3. คุณสมบัติผู้ใช้งานและการลงทะเบียน</h2>
              <p className="mb-3">แพลตฟอร์มนี้ออกแบบมาสำหรับชุมชนมหาวิทยาลัยกรุงเทพโดยเฉพาะ</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>ผู้ซื้อ:</strong> ผู้ใช้งานทั่วไปสามารถลงทะเบียนเพื่อเป็นผู้ซื้อได้</li>
                <li><strong>ผู้ขาย:</strong> ผู้ที่ประสงค์จะลงขายสินค้าบนแพลตฟอร์มนี้ จะต้องเป็นนักศึกษาหรือบุคลากรปัจจุบันของมหาวิทยาลัยกรุงเทพ และต้องทำการลงทะเบียนและยืนยันตัวตนผ่าน BUMail ที่ยังใช้งานได้เท่านั้น</li>
              </ul>
              <p className="mt-3">เราขอสงวนสิทธิ์ในการปฏิเสธการลงทะเบียน หรือระงับบัญชีผู้ขาย หากไม่สามารถยืนยันสถานะผ่าน BUMail ได้</p>
              <p className="mt-2">ผู้ใช้งานมีหน้าที่รับผิดชอบในการรักษารหัสผ่านให้เป็นความลับ และรับผิดชอบต่อกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของตน</p>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">4. กฎการใช้งานและพฤติกรรม</h2>
              <p className="mb-3">ผู้ใช้งานตกลงที่จะไม่ใช้บริการเพื่อ:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>ละเมิดกฎหมาย ข้อบังคับ หรือศีลธรรมอันดีของประชาชน</li>
                <li>สร้างข้อมูลอันเป็นเท็จ หลอกลวง หรือทำให้เข้าใจผิด</li>
                <li>ละเมิดสิทธิ์ในทรัพย์สินทางปัญญา ลิขสิทธิ์ หรือเครื่องหมายการค้าของผู้อื่น</li>
                <li>ส่งสแปม ไวรัส หรือมัลแวร์</li>
                <li>พยายามเข้าถึงบัญชีของผู้ใช้งานอื่นโดยไม่ได้รับอนุญาต</li>
              </ul>
            </div>

            {/* Section 5 - Important */}
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <h2 className="text-xl font-bold text-red-700 mb-3">5. สินค้าและเนื้อหาต้องห้าม (สำคัญ)</h2>
              <p className="mb-3 font-semibold">ผู้ใช้งาน <span className="text-red-600">ห้าม</span> ลงประกาศ เสนอขาย หรือส่งเสริมสินค้าหรือบริการดังต่อไปนี้โดยเด็ดขาด:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>สินค้าผิดกฎหมาย:</strong> สินค้าใดๆ ที่ขัดต่อกฎหมายไทยในปัจจุบัน</li>
                <li><strong>บุหรี่ไฟฟ้า (E-cigarettes):</strong> รวมถึงน้ำยาบุหรี่ไฟฟ้า (Vape juice) อุปกรณ์เสริม และส่วนประกอบทั้งหมดที่เกี่ยวข้อง</li>
                <li><strong>กัญชาและพืชกระท่อม:</strong> กัญชา กัญชง กระท่อม หรือผลิตภัณฑ์ใดๆ ที่มีส่วนผสมของสารสกัดจากพืชดังกล่าว</li>
                <li><strong>ยาเสพติดและสารควบคุม:</strong> รวมถึงยาตามใบสั่งแพทย์ที่จำหน่ายโดยไม่ได้รับอนุญาต</li>
                <li><strong>เครื่องดื่มแอลกอฮอล์และยาสูบ</strong></li>
                <li><strong>อาวุธ:</strong> ปืน มีด วัตถุระเบิด หรืออุปกรณ์ที่ออกแบบมาเพื่อทำร้ายร่างกาย</li>
                <li><strong>สื่อลามกอนาจาร:</strong> และเนื้อหาสำหรับผู้ใหญ่ทุกรูปแบบ</li>
                <li><strong>สินค้าที่ได้มาโดยทุจริต:</strong> เช่น ของโจร</li>
                <li><strong>บริการที่ผิดจรรยาบรรณ:</strong> เช่น การรับจ้างทำการบ้าน การสอบ หรือเขียนวิทยานิพนธ์</li>
              </ul>
              <p className="mt-3 font-semibold text-red-700">
                Walk4You ขอสงวนสิทธิ์ในการลบเนื้อหาหรือรายการสินค้าใดๆ ที่เราพิจารณาว่าละเมิดข้อกำหนดนี้ โดยไม่จำเป็นต้องแจ้งให้ทราบล่วงหน้า
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">6. การละเมิดและการยุติการให้บริการ</h2>
              <p className="mb-3">หากเราตรวจพบว่าผู้ใช้งานละเมิดข้อกำหนดใดๆ ในเอกสารนี้ โดยเฉพาะอย่างยิ่งการพยายามลงขายสินค้าต้องห้าม หรือการปลอมแปลงตัวตนผู้ขายโดยไม่ใช้ BUMail เราขอสงวนสิทธิ์ในการ:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>ลบเนื้อหาหรือรายการสินค้านั้นๆ</li>
                <li>ระงับบัญชีผู้ใช้งานชั่วคราว</li>
                <li>ยกเลิกบัญชีผู้ใช้งานถาวร</li>
                <li>ดำเนินมาตรการทางกฎหมาย (หากจำเป็น)</li>
              </ul>
            </div>

            {/* Section 7 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">7. การชำระเงินและการจัดส่ง</h2>
              <p className="leading-relaxed">
                ผู้ซื้อและผู้ขายตกลงและจัดการเรื่องการชำระเงินและการจัดส่งสินค้ากันเอง Walk4You ไม่ได้เป็นส่วนหนึ่งของกระบวนการนี้ แนะนำให้ผู้ใช้งานนัดรับสินค้าภายในพื้นที่มหาวิทยาลัยกรุงเทพเพื่อความปลอดภัย และตรวจสอบสินค้าก่อนชำระเงิน
              </p>
            </div>

            {/* Section 8 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">8. ข้อจำกัดความรับผิด</h2>
              <p className="leading-relaxed">
                เนื่องจากเราเป็นเพียงสื่อกลาง Walk4You จึงไม่รับผิดชอบต่อความเสียหาย การสูญหาย หรือข้อพิพาทใดๆ ที่เกิดขึ้นระหว่างผู้ซื้อและผู้ขาย ทั้งในด้านคุณภาพสินค้า การชำระเงิน หรือการจัดส่ง ผู้ใช้งานตกลงที่จะใช้บริการนี้บนความเสี่ยงของตนเอง
              </p>
            </div>

            {/* Section 9 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">9. การเปลี่ยนแปลงข้อกำหนด</h2>
              <p className="leading-relaxed">
                เราขอสงวนสิทธิ์ในการแก้ไขหรือเปลี่ยนแปลงข้อกำหนดเหล่านี้ได้ตลอดเวลา การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนหน้านี้ การที่คุณยังคงใช้บริการต่อไปหลังจากการเปลี่ยนแปลง ถือว่าคุณยอมรับข้อกำหนดใหม่
              </p>
            </div>

            {/* Section 11 */}
            <div>   
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">10. การติดต่อ</h2>
              <p className="leading-relaxed">
                หากมีข้อสงสัยเกี่ยวกับข้อกำหนดเหล่านี้ โปรดติดต่อเราที่: <a href="mailto:support@walk4you.com" className="text-[#0B44A3] underline hover:no-underline">support@walk4you.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        {onAccept && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex gap-4 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] !text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                ยอมรับข้อกำหนด
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
