import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

/** 2–100 characters, no control characters. (A repeated ?q= arrives as an array.) */
@Injectable()
export class SearchTextPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    const text = typeof value === 'string' ? value.trim() : '';
    if (
      text.length < 2 ||
      text.length > 100 ||
      // eslint-disable-next-line no-control-regex -- finding control characters is the point
      /[\u0000-\u001f\u007f]/.test(value as string)
    )
      throw new BadRequestException(
        'Search for a title using 2–100 characters.',
      );
    return text;
  }
}
