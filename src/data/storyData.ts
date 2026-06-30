import { Chapter, ObjectiveType, QuestStatus } from '../types';

export const STORY_DATA: Chapter[] = [
  {
    id: 1,
    title: "New Beginning",
    titleAr: "بداية جديدة",
    introCutscene: [
      {
        duration: 5,
        cameraStart: { x: 0, y: 50, z: -200 },
        cameraEnd: { x: 0, y: 20, z: -100 },
        lookAtStart: { x: 0, y: 0, z: 0 },
        lookAtEnd: { x: 0, y: 10, z: 0 },
        text: "Taiz, the city of culture and history. A new day begins in the heart of Yemen.",
        textAr: "تعز، مدينة الثقافة والتاريخ. يبدأ يوم جديد في قلب اليمن."
      }
    ],
    quests: [
      {
        id: 'q1_welcome',
        title: "Home Sweet Home",
        titleAr: "البيت السعيد",
        chapter: 1,
        description: "Visit your family home and speak with your father about your future.",
        descriptionAr: "قم بزيارة منزل عائلتك وتحدث مع والدك عن مستقبلك.",
        status: QuestStatus.Available,
        objectives: [
          {
            id: 'obj_reach_home',
            type: ObjectiveType.ReachLocation,
            description: "Reach your family house",
            descriptionAr: "الوصول إلى منزل العائلة",
            targetId: 'house_player',
            isCompleted: false
          }
        ],
        rewards: { money: 500, reputation: 10 },
        startDialogue: [
          {
            speaker: "Father",
            speakerAr: "الأب",
            text: "Welcome back, my son. It is time you started making your own path in this great city.",
            textAr: "أهلاً بك يا بني. لقد حان الوقت لتبدأ في صنع طريقك الخاص في هذه المدينة العظيمة."
          }
        ]
      },
      {
        id: 'q2_first_job',
        title: "First Delivery",
        titleAr: "المهمة الأولى",
        chapter: 1,
        description: "Help Uncle Mukhtar deliver fresh fruits to the market.",
        descriptionAr: "ساعد العم مختار في توصيل الفواكه الطازجة إلى السوق.",
        status: QuestStatus.Locked,
        objectives: [
          {
            id: 'obj_talk_mukhtar',
            type: ObjectiveType.InteractWithNPC,
            description: "Speak with Uncle Mukhtar near the Shas",
            descriptionAr: "تحدث مع العم مختار بجانب الشاص",
            targetId: 'npc_mukhtar_1',
            isCompleted: false
          },
          {
            id: 'obj_deliver_fruit',
            type: ObjectiveType.ReachLocation,
            description: "Deliver fruits to Market Square",
            descriptionAr: "توصيل الفواكه إلى ساحة السوق",
            targetId: 'market_square',
            isCompleted: false
          }
        ],
        rewards: { money: 1500, reputation: 25 }
      }
    ]
  }
];
