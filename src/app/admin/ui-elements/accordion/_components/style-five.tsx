import { accordionData } from "@/app/admin/ui-elements/accordion/_components/data";
import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from "@/nextadmin/components/tailgrids/core/accordion";

export function StyleFive() {
  return (
    <AccordionRoot variant="style_five">
      {accordionData.map((item) => (
        <AccordionItem key={item.id}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </AccordionRoot>
  );
}
