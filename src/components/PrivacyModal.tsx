'use client';

import { X, Shield } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function PrivacyModal({ isOpen, onClose, onAccept }: PrivacyModalProps) {
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
            <Shield className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-center">นโยบายความเป็นส่วนตัว</h1>
          </div>
          <p className="text-center text-blue-100 text-sm mt-2">Privacy Policy</p>
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
              <strong>Walk4You</strong> ("บริการ", "เรา", "เว็บไซต์") ให้ความสำคัญอย่างยิ่งต่อการคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้งาน ("ท่าน") นโยบายความเป็นส่วนตัวนี้อธิบายถึงวิธีที่เราเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน เมื่อท่านเข้าใช้งานเว็บไซต์และบริการของเรา
            </p>

            <p className="text-base leading-relaxed font-semibold">
              การที่ท่านใช้งานบริการนี้ ถือว่าท่านได้อ่านและยอมรับข้อตกลงในนโยบายความเป็นส่วนตัวนี้แล้ว
            </p>

            {/* Section 1 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">1. ข้อมูลที่เราเก็บรวบรวม</h2>
              <p className="mb-3">เราเก็บรวบรวมข้อมูลส่วนบุคคลที่จำเป็นต่อการให้บริการ เพื่อให้เป็นไปตามข้อกำหนดและเงื่อนไขของเรา โดยแบ่งเป็น:</p>
              
              <div className="ml-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1.1 ข้อมูลที่ท่านให้กับเราโดยตรง:</h3>
                  
                  <div className="ml-4 mb-3">
                    <p className="font-semibold mb-2">ข้อมูลสำหรับการสมัครสมาชิก (ผู้ใช้งานทั่วไป):</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>ชื่อ-นามสกุลจริง:</strong> เพื่อใช้ในการยืนยันตัวตนและติดต่อ</li>
                      <li><strong>เบอร์โทรศัพท์:</strong> เพื่อใช้ในการติดต่อสื่อสาร และอาจใช้สำหรับการยืนยันตัวตน (เช่น ผ่าน OTP)</li>
                      <li><strong>วัน เดือน ปีเกิด:</strong> เพื่อใช้ในการยืนยันคุณสมบัติด้านอายุ</li>
                    </ul>
                  </div>

                  <div className="ml-4 mb-3">
                    <p className="font-semibold mb-2">ข้อมูลสำหรับผู้ขาย (เพิ่มเติมจากข้อ 1.1):</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>อีเมล BUMail:</strong> เพื่อยืนยันสถานะการเป็นนักศึกษาหรือบุคลากรของมหาวิทยาลัยกรุงเทพ ตามข้อกำหนดและเงื่อนไขการให้บริการ</li>
                      <li><strong>ข้อมูลอื่นๆ:</strong> เช่น ข้อมูลที่ท่านติดต่อกับเราผ่านฝ่ายบริการลูกค้า</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1.2 ข้อมูลที่เรารวบรวมโดยอัตโนมัติ:</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>ข้อมูลการใช้งาน:</strong> เช่น หน้าเว็บที่ท่านเข้าชม, สินค้าที่ท่านสนใจ</li>
                    <li><strong>ข้อมูลทางเทคนิค:</strong> เช่น ที่อยู่ IP, ประเภทของเบราว์เซอร์, อุปกรณ์ที่ใช้งาน</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
              <p className="mb-3">เราใช้ข้อมูลส่วนบุคคลของท่านเพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>เพื่อยืนยันคุณสมบัติผู้ใช้งาน:</strong> เราใช้ข้อมูล วัน เดือน ปีเกิด ของท่าน เพื่อตรวจสอบและยืนยันว่าท่านมีอายุ 18 ปีบริบูรณ์ขึ้นไป ตามข้อกำหนดและเงื่อนไขการให้บริการของเรา</li>
                <li><strong>เพื่อให้บริการและจัดการบัญชี:</strong> เพื่อสร้างบัญชี, ยืนยันตัวตนผู้ขาย (ผ่าน BUMail), และดูแลการใช้งานแพลตฟอร์ม</li>
                <li><strong>เพื่อการติดต่อสื่อสาร:</strong> เพื่อส่งการแจ้งเตือนที่สำคัญ, ติดต่อกลับเมื่อท่านมีข้อสงสัย, หรืออำนวยความสะดวกในการสื่อสารระหว่างผู้ซื้อและผู้ขาย</li>
                <li><strong>เพื่อบังคับใช้ข้อกำหนด:</strong> เพื่อตรวจสอบการใช้งานที่เป็นไปตามข้อกำหนดและเงื่อนไข และนโยบายสินค้าต้องห้าม</li>
                <li><strong>เพื่อปฏิบัติตามกฎหมาย:</strong> เพื่อปฏิบัติตามภาระหน้าที่ตามกฎหมาย หรือการร้องขอจากหน่วยงานภาครัฐ</li>
              </ul>
            </div>

            {/* Section 3 - Important */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <h2 className="text-xl font-bold text-amber-700 mb-3">3. การจำกัดอายุ (Age Restriction)</h2>
              <p className="leading-relaxed mb-3">
                <strong>บริการนี้ จำกัดสำหรับผู้ที่มีอายุ 18 ปีบริบูรณ์ขึ้นไปเท่านั้น</strong> เราไม่มีเจตนาเก็บรวบรวมข้อมูลส่วนบุคคลจากผู้เยาว์ที่อายุต่ำกว่า 18 ปี
              </p>
              <p className="leading-relaxed">
                การเก็บรวบรวมข้อมูล "วัน เดือน ปีเกิด" มีวัตถุประสงค์หลักเพื่อคัดกรองและยืนยันคุณสมบัติด้านอายุของผู้ใช้งาน หากเราตรวจพบว่าเราได้เก็บข้อมูลของผู้ที่มีอายุต่ำกว่า 18 ปี โดยปราศจากความยินยอมของผู้ปกครอง (หากจำเป็นตามกฎหมาย) เราจะดำเนินการลบข้อมูลนั้นออกจากระบบของเราโดยเร็วที่สุด
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">4. การเปิดเผยข้อมูลส่วนบุคคล</h2>
              <p className="mb-3">เราจะไม่ขาย หรือให้เช่าข้อมูลส่วนบุคคลของท่านแก่บุคคลที่สาม อย่างไรก็ตาม เราอาจเปิดเผยข้อมูลของท่านในกรณีดังต่อไปนี้:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>ระหว่างผู้ใช้งาน:</strong> เราอาจอำนวยความสะดวกในการเปิดเผยข้อมูลที่จำเป็น (เช่น ชื่อ หรือเบอร์โทรศัพท์) ระหว่างผู้ซื้อและผู้ขาย เพื่อให้การทำธุรกรรมและการนัดรับสินค้าสำเร็จลุล่วง</li>
                <li><strong>ตามข้อบังคับของกฎหมาย:</strong> หากเราได้รับหมายเรียก คำสั่งศาล หรือการร้องขอทางกฎหมายจากหน่วยงานที่เกี่ยวข้อง</li>
                <li><strong>เพื่อความปลอดภัย:</strong> เพื่อปกป้องสิทธิ์ ความปลอดภัย หรือทรัพย์สินของ Walk4You, ผู้ใช้งานของเรา หรือสาธารณะ</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">5. การรักษาความปลอดภัยของข้อมูล</h2>
              <p className="leading-relaxed">
                เราใช้มาตรการรักษาความปลอดภัยทางเทคนิคและการบริหารจัดการที่เหมาะสม เพื่อปกป้องข้อมูลส่วนบุคคลของท่านจากการเข้าถึง, การแก้ไข, หรือการเปิดเผยโดยไม่ได้รับอนุญาต อย่างไรก็ตาม โปรดทราบว่าไม่มีระบบใดบนอินเทอร์เน็ตที่ปลอดภัย 100%
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">6. สิทธิ์ของเจ้าของข้อมูล</h2>
              <p className="leading-relaxed">
                ท่านมีสิทธิ์ในการเข้าถึง, แก้ไข, หรือร้องขอให้ลบข้อมูลส่วนบุคคลของท่าน (ภายใต้ข้อจำกัดของกฎหมายและข้อกำหนดของแพลตฟอร์ม) ท่านสามารถดำเนินการได้ผ่านหน้าตั้งค่าบัญชี หรือติดต่อเราโดยตรง
              </p>
            </div>
            {/* Section 7 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">7. การเปลี่ยนแปลงนโยบาย</h2>
              <p className="leading-relaxed">
                เราอาจมีการปรับปรุงนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว เราจะแจ้งให้ท่านทราบถึงการเปลี่ยนแปลงที่สำคัญผ่านทางอีเมลหรือการแจ้งเตือนบนเว็บไซต์
              </p>
            </div>

            {/* Section 8 */}
            <div>
              <h2 className="text-xl font-bold text-[#0B44A3] mb-3">8. ติดต่อเรา</h2>
              <p className="leading-relaxed">
                หากท่านมีข้อสงสัยหรือข้อกังวลเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ โปรดติดต่อเราได้ที่: <a href="mailto:support@walk4you.com" className="text-[#0B44A3] underline hover:no-underline">support@walk4you.com</a>
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
                ปิด
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] !text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                ยอมรับนโยบาย
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
