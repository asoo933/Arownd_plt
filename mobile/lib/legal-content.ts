export type LegalDocumentSection = {
  title: string;
  body: string;
};

export type LegalDocument = {
  title: string;
  updatedAt: string;
  sections: LegalDocumentSection[];
};

const documents: Record<"ar" | "en", Record<"privacy" | "terms", LegalDocument>> = {
  ar: {
    privacy: {
      title: "سياسة الخصوصية",
      updatedAt: "آخر تحديث: 14 نوفمبر 2026",
      sections: [
        { title: "1. الجهة المسؤولة والتواصل", body: "الجهة المشغّلة للخدمة هي فريق Arownd. لأي سؤال متعلق بالخصوصية أو طلب متعلق ببياناتك أو حذف حسابك، تواصل معنا عبر arownddz@gmail.com." },
        { title: "2. المعلومات التي قد نعالجها", body: "بحسب الميزات التي تستخدمها، قد نعالج معلومات الحساب مثل الاسم والبريد الإلكتروني ورقم الهاتف ومعرّف الحساب ونوعه؛ ومعلومات الملف الشخصي والمتجر؛ وبيانات التوصيل والطلبات مثل اسم المستلم ورقم هاتفه وعنوان التسليم والمنتجات والكميات والأسعار وحالة الطلب؛ ومعلومات المنتجات والصور؛ والتقييمات والتعليقات والمفضلة؛ ورسائل الدعم؛ ورمز الجهاز اللازم للإشعارات؛ ورموز الدعوة أو الإحالة. نصل إلى الصور عندما تختار صورة لإضافتها إلى ملفك أو متجرك أو منتجاتك." },
        { title: "3. لماذا نستخدم المعلومات؟", body: "نستخدم المعلومات لإنشاء الحساب وإدارته، وعرض المتاجر والمنتجات، وتسهيل الطلبات والتوصيل والدفع عند الاستلام (COD)، وإظهار التقييمات والمفضلة، والرد على استفسارات الدعم، وإرسال الإشعارات المرتبطة بالخدمة، وحماية المنصة واكتشاف إساءة الاستخدام ومعالجة الأعطال والالتزام بالمتطلبات القانونية." },
        { title: "4. متى تتم مشاركة المعلومات؟", body: "قد نشارك الحد الأدنى اللازم من بيانات الطلب مع المتجر المعني لتنفيذه والتواصل بشأنه، مثل اسم المستلم ورقم هاتفه وعنوان التسليم وتفاصيل المنتجات. وقد تكون بيانات المتجر والمنتجات وصورها والتقييمات المنشورة متاحة للمستخدمين الآخرين. وقد تعالج جهات تقدم خدمات تقنية المعلومات نيابة عنا بالقدر اللازم لتشغيل الخدمة وحمايتها. وقد نفصح عن المعلومات عند وجود التزام قانوني أو لحماية المستخدمين والخدمة." },
        { title: "5. مدة الاحتفاظ بالمعلومات", body: "نحتفظ بالمعلومات ما دامت لازمة لتقديم الميزات وإدارة الحساب والطلبات والدعم وحماية الخدمة وتسوية النزاعات والوفاء بالالتزامات القانونية. وقد نحتفظ ببعض سجلات الطلبات أو المعاملات لأغراض قانونية أو محاسبية أو أمنية أو لمنع الاحتيال. تختلف المدة بحسب نوع السجل والغرض منه، ولا توجد مدة موحدة لجميع الفئات." },
        { title: "6. الوصول والتصحيح والحذف", body: "يمكنك طلب تصحيح معلوماتك أو الاستفسار عن بيانات حسابك أو طلب حذف الحساب والبيانات المرتبطة به عبر مراسلتنا من البريد المرتبط بالحساب على arownddz@gmail.com. اكتب «طلب حذف حساب Arownd» في عنوان الرسالة. قد نطلب معلومات معقولة للتحقق من ملكية الحساب. بعد التحقق، نحذف البيانات التي لم تعد هناك حاجة مشروعة للاحتفاظ بها. وقد تبقى سجلات يلزم الاحتفاظ بها قانونياً أو محاسبياً أو أمنياً أو لحسم عمليات قائمة. يمكنك الاطلاع على خطوات الطلب في صفحة حذف الحساب على موقعنا." },
        { title: "7. حماية المعلومات", body: "نطبق تدابير تقنية وتنظيمية تهدف إلى حماية المعلومات من الوصول أو الاستخدام أو التغيير أو الإفصاح غير المصرح به. ومع ذلك، لا يمكن ضمان أمن أي نظام أو وسيلة نقل بيانات بصورة مطلقة." },
        { title: "8. خصوصية الأطفال", body: "الخدمة ليست موجهة للأطفال الذين لا يسمح لهم باستخدامها بموجب القوانين المعمول بها. إذا كنت تعتقد أن طفلاً قدم لنا معلومات شخصية بالمخالفة لهذه المتطلبات، يرجى التواصل معنا." },
        { title: "9. التغييرات على هذه السياسة", body: "قد نحدّث هذه السياسة عند تغيير الخدمة أو المتطلبات القانونية. سننشر النسخة المحدثة في هذه الصفحة مع تعديل تاريخ آخر تحديث." },
        { title: "10. التواصل", body: "للاستفسارات وطلبات الخصوصية والحذف: arownddz@gmail.com." }
      ]
    },
    terms: {
      title: "شروط الاستخدام",
      updatedAt: "آخر تحديث: 14 نوفمبر 2026",
      sections: [
        { title: "1. الجهة المشغّلة وقبول الشروط", body: "يُشغّل الخدمة فريق Arownd. باستخدام التطبيق أو الموقع أو إنشاء حساب، فإنك توافق على هذه الشروط وسياسة الخصوصية. إذا لم توافق عليها، فتوقف عن استخدام الخدمة." },
        { title: "2. وصف الخدمة", body: "Arownd منصة رقمية تساعد المستخدمين على اكتشاف المتاجر والمنتجات والتواصل بشأنها وإنشاء الطلبات، كما تتيح للمتاجر عرض معلوماتها ومنتجاتها وإدارة العروض والطلبات وفق الميزات المتاحة. قد تختلف الميزات بحسب البلد ونوع الحساب وإصدار التطبيق." },
        { title: "3. الحساب وأمنه", body: "قدّم معلومات صحيحة وحدّثها عند تغيرها. حافظ على سرية بيانات تسجيل الدخول ورموز التحقق، وأبلغنا عند الاشتباه في استخدام غير مصرح به. لا تنشئ حسابات بهويات مضللة أو تنتحل شخصية شخص أو متجر آخر." },
        { title: "4. الطلبات والدفع", body: "طريقة الدفع المتاحة حالياً هي الدفع عند الاستلام (COD) فقط. لا يوفر التطبيق حالياً الدفع بالبطاقات أو المحافظ أو التحويل الإلكتروني. راجع تفاصيل الطلب والسعر ورسوم التوصيل وطريقة التسليم قبل تأكيده. تخضع الأسعار والمخزون والتوفر للمعلومات التي يعرضها المتجر وقد تتغير قبل قبول الطلب." },
        { title: "5. مسؤوليات المتاجر", body: "على المتجر تقديم معلومات دقيقة ومحدثة عن هويته ومنتجاته وأسعاره ومخزونه ووسائل التواصل والتوصيل، والالتزام بالقوانين، واحترام الطلبات التي يؤكدها. يتحمل المتجر مسؤولية صحة أوصاف المنتجات وصورها وجودتها والتزاماته تجاه المشتري." },
        { title: "6. المحتوى وسلوك المستخدم", body: "يجب أن يكون المحتوى المنشور صحيحاً وملائماً وألا ينتهك حقوق الآخرين أو خصوصيتهم أو القانون. يحظر نشر محتوى غير قانوني أو احتيالي أو مضلل أو مسيء أو تهديدي أو ينطوي على كراهية أو تحرش أو استغلال أو انتهاك للملكية الفكرية، كما يحظر التلاعب بالتقييمات أو إساءة استخدام الطلبات أو محاولة تعطيل الخدمة. للإبلاغ عن محتوى مخالف، استخدم خيار الإبلاغ داخل التطبيق أو تواصل معنا عبر arownddz@gmail.com." },
        { title: "7. حقوق المحتوى", body: "تحتفظ بحقوقك في المحتوى الذي تملكه. وبإرساله أو نشره عبر الخدمة، تمنح فريق Arownd إذناً محدوداً وغير حصري لاستخدامه وعرضه وتخزينه بالقدر اللازم لتشغيل الخدمة. يجب ألا ترفع محتوى لا تملك حق استخدامه." },
        { title: "8. توفر الخدمة والتغييرات", body: "نسعى إلى تشغيل الخدمة بصورة مستقرة، لكن قد تتوقف بعض الميزات مؤقتاً للصيانة أو لأسباب تقنية أو أمنية أو خارجة عن سيطرتنا. قد نضيف ميزات أو نعدلها أو نوقفها." },
        { title: "9. تعليق الحساب أو إنهاؤه", body: "يجوز تقييد الوصول إلى الخدمة أو تعليق الحساب عند وجود مخالفة لهذه الشروط أو نشاط احتيالي أو خطر أمني أو التزام قانوني. يمكنك طلب حذف حسابك عبر arownddz@gmail.com. تخضع معالجة طلب الحذف لسياسة الخصوصية، وقد تحتفظ بعض السجلات عند وجود سبب قانوني أو محاسبي أو أمني مشروع." },
        { title: "10. حدود المسؤولية", body: "لا تلغي هذه الشروط أي حقوق إلزامية يقررها القانون للمستهلك أو المستخدم. وبالقدر الذي يسمح به القانون، لا يتحمل فريق Arownd المسؤولية عن الأضرار الناشئة حصراً عن معلومات أو محتوى يقدمه مستخدم أو متجر آخر، أو عن أطراف لا نتحكم بها. ولا يحد هذا البند من المسؤولية التي لا يجوز استبعادها قانوناً." },
        { title: "11. التعديلات والتواصل", body: "قد نحدّث هذه الشروط عند تطوير الخدمة أو تغير المتطلبات القانونية. ننشر النسخة المحدثة في هذه الصفحة مع تاريخ آخر تحديث. للاستفسارات أو الشكاوى أو البلاغات، تواصل عبر arownddz@gmail.com." }
      ]
    }
  },
  en: {
    privacy: {
      title: "Privacy Policy",
      updatedAt: "Last updated: November 14, 2026",
      sections: [
        { title: "1. Operator and contact", body: "Arownd is operated by Team Arownd. For privacy questions, data requests, or account deletion requests, contact arownddz@gmail.com." },
        { title: "2. Information we may process", body: "Depending on the features you use, this may include account details such as your name, email address, phone number, account identifier and account type; profile and store details; delivery and order information such as recipient name, phone number, delivery address, items, quantities, prices and order status; product information and images; reviews, comments and favorites; support messages; device tokens needed for notifications; and invitation or referral codes. Photo access is used when you choose an image for your profile, store or products." },
        { title: "3. How we use information", body: "We use information to create and manage accounts, display stores and products, facilitate orders, delivery and cash-on-delivery (COD), display reviews and favorites, respond to support requests, deliver service-related notifications, protect the platform, detect misuse, troubleshoot issues and meet legal requirements." },
        { title: "4. When information is shared", body: "The minimum order information needed to fulfil an order may be shared with the relevant store, such as the recipient's name, phone number, delivery address and order details. Store and product listings, images and published reviews may be visible to other users. Technical service providers may process information on our behalf as needed to operate and protect the service. We may disclose information when legally required or to protect users and the service." },
        { title: "5. Retention", body: "We retain information while needed to provide features, manage accounts, orders and support, protect the service, resolve disputes and meet legal obligations. Certain order or transaction records may be retained for legal, accounting, security or fraud-prevention purposes. Retention periods vary by record type and purpose." },
        { title: "6. Access, correction and deletion", body: "You may request correction, ask about account data, or request deletion of your account and associated data by emailing arownddz@gmail.com from the email address associated with your account. Use the subject “Arownd account deletion request”. We may request reasonable information to verify ownership. After verification, we delete information that no longer needs to be retained for a legitimate purpose. Records required for legal, accounting, security or pending-transaction purposes may be retained. See our public account deletion page for instructions." },
        { title: "7. Information security", body: "We use technical and organizational safeguards designed to protect information from unauthorized access, use, alteration or disclosure. No system or data transmission method can be guaranteed completely secure." },
        { title: "8. Children's privacy", body: "The service is not intended for children who are not legally permitted to use it. If you believe a child has provided personal information in violation of these requirements, contact us." },
        { title: "9. Changes", body: "We may update this policy as the service or legal requirements change. The revised version and update date will be published on this page." },
        { title: "10. Contact", body: "Privacy and deletion requests: arownddz@gmail.com." }
      ]
    },
    terms: {
      title: "Terms of Use",
      updatedAt: "Last updated: November 14, 2026",
      sections: [
        { title: "1. Operator and acceptance", body: "Arownd is operated by Team Arownd. By using the app or website or creating an account, you agree to these Terms and the Privacy Policy. If you do not agree, stop using the service." },
        { title: "2. Service description", body: "Arownd is a digital platform that helps users discover stores and products, communicate about them and place orders. Stores can present their information and products and manage offers and orders through available app features. Features may vary by country, account type and app version." },
        { title: "3. Accounts and security", body: "Provide accurate information and keep it up to date. Keep sign-in credentials and verification codes confidential, and promptly report suspected unauthorized use. Do not create misleading accounts or impersonate another person or store." },
        { title: "4. Orders and payment", body: "The only payment method currently available is cash on delivery (COD). The app does not currently offer card, wallet or online-transfer payments. Review order details, price, delivery fees and delivery method before confirming. Prices, stock and availability are based on store information and may change before an order is accepted." },
        { title: "5. Store responsibilities", body: "Stores must provide accurate and current information about their identity, products, prices, stock, contact and delivery arrangements, comply with applicable law and respect orders they accept. Stores are responsible for product descriptions, images, quality and their obligations to buyers." },
        { title: "6. User content and conduct", body: "Published content must be accurate, appropriate and must not violate others' rights, privacy or the law. Illegal, fraudulent, misleading, abusive, threatening, hateful, harassing, exploitative or infringing content is prohibited, as are rating manipulation, order abuse and attempts to disrupt the service. Report inappropriate content using the in-app report option or contact arownddz@gmail.com." },
        { title: "7. Content rights", body: "You retain rights to content you own. By submitting or publishing it through the service, you grant Team Arownd a limited, non-exclusive permission to use, display and store it as needed to operate the service. Do not upload content you are not authorized to use." },
        { title: "8. Availability and changes", body: "We aim to keep the service available, but features may be temporarily unavailable for maintenance, technical or security reasons, or circumstances beyond our control. We may add, change or discontinue features." },
        { title: "9. Suspension and termination", body: "Access may be restricted or an account suspended for violations, fraud, security risks or legal requirements. You may request account deletion by emailing arownddz@gmail.com. Deletion is handled under the Privacy Policy; certain records may be retained for legitimate legal, accounting or security reasons." },
        { title: "10. Liability", body: "These Terms do not limit mandatory consumer or user rights under applicable law. To the extent permitted by law, Team Arownd is not responsible for harm arising solely from content supplied by another user or store, or from parties outside our control. Nothing excludes liability that cannot legally be excluded." },
        { title: "11. Changes and contact", body: "We may update these Terms as the service or legal requirements change. The revised version and update date will be published on this page. Contact Team Arownd at arownddz@gmail.com." }
      ]
    }
  }
};

export function getLegalDocument(
  document: "privacy" | "terms",
  language: "ar" | "en"
): LegalDocument {
  return documents[language][document];
}
